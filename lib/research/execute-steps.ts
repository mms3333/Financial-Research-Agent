import OpenAI from "openai";
import { QUERY_GENERATION_PROMPT, STEP_SUMMARY_PROMPT } from "@/lib/prompts";
import { completeJson } from "@/lib/openai";
import { searchTavily } from "@/lib/tavily";
import {
  ResearchPlan,
  ResearchStep,
  StepExecutionResult,
  TavilySearchResponse
} from "@/lib/types";

export function tickerToProject(ticker: string): string {
  const symbol = ticker.trim().toUpperCase();
  const year = new Date().getFullYear();
  return [
    `Comprehensive equity research on ${symbol} (${year}).`,
    "Cover company profile, recent SEC filings and financial statements,",
    "valuation and fundamentals, competitive positioning, material risks,",
    "recent news and catalysts, and sell-side or expert sentiment."
  ].join(" ");
}

export function extractExplicitYear(project: string): string | null {
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

export interface ExecuteResearchStepsOptions {
  project: string;
  plan: ResearchPlan;
  explicitYear?: string | null;
  onStepStart?: (step: ResearchStep) => void;
  onStepComplete?: (result: StepExecutionResult) => void;
}

export interface ExecuteResearchStepsOutput {
  stepResults: StepExecutionResult[];
  finalEvidence: Array<{
    stepId: string;
    stepTitle: string;
    query: string;
    summary: string;
    sources: Array<{ title: string; url: string; excerpt: string }>;
  }>;
}

/**
 * Runs the Tavily-backed research loop for each plan step (shared by API route and LangGraph).
 */
export async function executeResearchSteps(
  client: OpenAI,
  options: ExecuteResearchStepsOptions
): Promise<ExecuteResearchStepsOutput> {
  const { project, plan, explicitYear = null, onStepStart, onStepComplete } = options;
  const stepResults: StepExecutionResult[] = [];
  const finalEvidence: ExecuteResearchStepsOutput["finalEvidence"] = [];

  for (const step of plan.steps ?? []) {
    onStepStart?.(step);

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
    let tavilyResults = explicitYear ? filterResultsByYear(initialResults, explicitYear) : initialResults;

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

    onStepComplete?.(result);
  }

  return { stepResults, finalEvidence };
}
