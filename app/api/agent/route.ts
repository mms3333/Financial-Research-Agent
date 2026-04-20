import {
  FINAL_REPORT_PROMPT,
  PLANNING_PROMPT,
  QUERY_GENERATION_PROMPT,
  STEP_SUMMARY_PROMPT
} from "@/lib/prompts";
import { searchTavily } from "@/lib/tavily";
import { completeJson, completeText, createOpenAIClient } from "@/lib/openai";
import {
  AgentStreamEvent,
  ResearchPlan,
  ResearchStep,
  TavilySearchResponse,
  StepExecutionResult
} from "@/lib/types";

function encodeEvent(event: AgentStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

function extractExplicitYear(project: string): string | null {
  const match = project.match(/\b(20\d{2})\b/);
  return match?.[1] ?? null;
}

function isYearRelevant(item: { title: string; url: string; content: string }, year: string): boolean {
  const haystack = `${item.title} ${item.url} ${item.content}`.toLowerCase();
  return haystack.includes(year);
}

function filterResultsByYear(results: TavilySearchResponse, year: string): TavilySearchResponse {
  return {
    query: results.query,
    results: results.results.filter((item) => isYearRelevant(item, year))
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { project, mode } = (await request.json()) as { project?: string; mode?: "plan_only" | "full" };
    if (!project || !project.trim()) {
      return Response.json({ error: "Project is required." }, { status: 400 });
    }
    const explicitYear = extractExplicitYear(project);

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const client = createOpenAIClient();

        const write = (event: AgentStreamEvent) => controller.enqueue(encodeEvent(event));

        try {
          const plan = await completeJson<ResearchPlan>(
            client,
            PLANNING_PROMPT,
            `Project:\n${project}`
          );

          write({ type: "plan", payload: plan });
          if (mode === "plan_only") {
            controller.close();
            return;
          }

          const stepResults: StepExecutionResult[] = [];
          const finalEvidence: Array<{
            stepId: string;
            stepTitle: string;
            query: string;
            summary: string;
            sources: Array<{ title: string; url: string; excerpt: string }>;
          }> = [];

          for (const step of plan.steps ?? []) {
            write({ type: "step-status", payload: { stepId: step.id, status: "in_progress" } });

            const queryResponse = await completeJson<{ query: string }>(
              client,
              QUERY_GENERATION_PROMPT,
              [
                `Project: ${project}`,
                explicitYear ? `Explicit Year Constraint: ${explicitYear}` : null,
                `Step:\n${JSON.stringify(step, null, 2)}`
              ]
                .filter(Boolean)
                .join("\n")
            );

            const initialResults = await searchTavily(queryResponse.query);
            let tavilyResults = explicitYear
              ? filterResultsByYear(initialResults, explicitYear)
              : initialResults;

            if (explicitYear && tavilyResults.results.length === 0) {
              const retryQuery = `${queryResponse.query} ${explicitYear}`;
              const retryResults = await searchTavily(retryQuery);
              tavilyResults = filterResultsByYear(retryResults, explicitYear);
            }

            if (explicitYear && tavilyResults.results.length === 0) {
              throw new Error(
                `No Tavily sources matched the requested year (${explicitYear}) for step "${step.title}".`
              );
            }

            const summaryResponse = await completeJson<{
              summary: string;
              sources?: Array<{ title: string; url: string }>;
            }>(
              client,
              STEP_SUMMARY_PROMPT,
              [
                `Project: ${project}`,
                explicitYear ? `Required Year Constraint: ${explicitYear}` : null,
                `Step: ${JSON.stringify(step, null, 2)}`,
                `Search Query: ${queryResponse.query}`,
                `Raw Tavily Results:`,
                JSON.stringify(tavilyResults, null, 2)
              ]
                .filter(Boolean)
                .join("\n\n")
            );

            // Always include real Tavily links so users can open underlying articles.
            const tavilySources = tavilyResults.results
              .filter((item) => item.url)
              .map((item) => ({ title: item.title || "Source", url: item.url }));
            const llmSources = summaryResponse.sources ?? [];
            const mergedSources = [...llmSources, ...tavilySources].filter(
              (source, index, sources) =>
                !!source.url && sources.findIndex((candidate) => candidate.url === source.url) === index
            );

            const result: StepExecutionResult = {
              stepId: step.id,
              query: queryResponse.query,
              summary: summaryResponse.summary,
              sources: mergedSources.slice(0, 8)
            };

            stepResults.push(result);
            finalEvidence.push({
              stepId: step.id,
              stepTitle: step.title,
              query: queryResponse.query,
              summary: summaryResponse.summary,
              sources: tavilyResults.results.slice(0, 6).map((item) => ({
                title: item.title || "Source",
                url: item.url || "",
                excerpt: (item.content || "").slice(0, 1200)
              }))
            });
            write({ type: "step-result", payload: result });
            write({ type: "step-status", payload: { stepId: step.id, status: "complete" } });
          }

          const allSourceLinks = finalEvidence
            .flatMap((entry) => entry.sources.map((source) => ({ title: source.title, url: source.url })))
            .filter(
              (source, index, sources) =>
                !!source.url && sources.findIndex((candidate) => candidate.url === source.url) === index
            );

          const finalReport = await completeText(
            client,
            FINAL_REPORT_PROMPT,
            [
              `Project: ${project}`,
              explicitYear ? `Required Year Constraint: ${explicitYear}` : null,
              `Executed Steps:`,
              JSON.stringify(plan.steps as ResearchStep[], null, 2),
              `Step Findings (summaries and key links):`,
              JSON.stringify(stepResults, null, 2),
              `Raw Evidence Pack (all step-level Tavily excerpts):`,
              JSON.stringify(finalEvidence, null, 2),
              `All Sources (deduplicated):`,
              JSON.stringify(allSourceLinks, null, 2)
            ]
              .filter(Boolean)
              .join("\n\n")
          );

          // Stream final report progressively so the client can render in real time.
          const chunkSize = 240;
          for (let index = 0; index < finalReport.length; index += chunkSize) {
            write({
              type: "final-report-chunk",
              payload: { chunk: finalReport.slice(index, index + chunkSize) }
            });
          }

          write({ type: "final-report-complete", payload: { report: finalReport } });
          controller.close();
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown agent error.";
          write({ type: "error", payload: { message } });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
}
