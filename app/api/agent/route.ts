import {
  FINAL_REPORT_PROMPT,
  PLANNING_PROMPT
} from "@/lib/prompts";
import { completeJson, completeText, createOpenAIClient } from "@/lib/openai";
import { executeResearchSteps, extractExplicitYear } from "@/lib/research/execute-steps";
import {
  AgentStreamEvent,
  ResearchPlan,
  ResearchStep
} from "@/lib/types";

function encodeEvent(event: AgentStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
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

          const { stepResults: executed, finalEvidence } = await executeResearchSteps(client, {
            project,
            plan,
            explicitYear,
            onStepStart: (step) => {
              write({ type: "step-status", payload: { stepId: step.id, status: "in_progress" } });
            },
            onStepComplete: (result) => {
              write({ type: "step-result", payload: result });
              write({ type: "step-status", payload: { stepId: result.stepId, status: "complete" } });
            }
          });

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
              JSON.stringify(executed, null, 2),
              `Raw Evidence Pack (all step-level Tavily excerpts):`,
              JSON.stringify(finalEvidence, null, 2),
              `All Sources (deduplicated):`,
              JSON.stringify(allSourceLinks, null, 2)
            ]
              .filter(Boolean)
              .join("\n\n")
          );

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
