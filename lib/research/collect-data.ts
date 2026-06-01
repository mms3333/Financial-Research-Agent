import { PLANNING_PROMPT } from "@/lib/prompts";
import { completeJson, createOpenAIClient } from "@/lib/openai";
import { ResearchPlan } from "@/lib/types";
import {
  executeResearchSteps,
  extractExplicitYear,
  tickerToProject
} from "@/lib/research/execute-steps";
import type {
  CompanyInformation,
  FinancialDataBundle,
  NewsDataBundle,
  ResearchEvidence,
  ResearchState
} from "@/lib/research/types";

const FINANCIAL_KEYWORDS =
  /\b(financial|earnings|revenue|margin|cash flow|balance sheet|income statement|sec filing|10-k|10-q|valuation|fundamental|guidance)\b/i;
const NEWS_KEYWORDS =
  /\b(news|headline|announcement|catalyst|sentiment|market reaction|recent development|regulatory|litigation)\b/i;
const COMPANY_KEYWORDS =
  /\b(company|business model|overview|profile|competitive|industry|management|strategy|moat)\b/i;

function stepMatches(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function dedupeSources(
  sources: Array<{ title: string; url: string }>
): Array<{ title: string; url: string }> {
  return sources.filter(
    (source, index, list) =>
      !!source.url && list.findIndex((candidate) => candidate.url === source.url) === index
  );
}

function buildResearchContext(evidence: ResearchEvidence): string {
  return evidence.finalEvidence
    .map(
      (entry) =>
        `### ${entry.stepTitle}\nQuery: ${entry.query}\n\n${entry.summary}\n\nKey excerpts:\n${entry.sources
          .map((s) => `- ${s.title}: ${s.excerpt.slice(0, 400)}`)
          .join("\n")}`
    )
    .join("\n\n---\n\n");
}

function categorizeEvidence(evidence: ResearchEvidence, ticker: string): Pick<
  ResearchState,
  "company_information" | "financial_data" | "news_data" | "research_context"
> {
  const financialSummaries: FinancialDataBundle["summaries"] = [];
  const newsSummaries: NewsDataBundle["summaries"] = [];
  const companySummaries: string[] = [];
  const financialSources: Array<{ title: string; url: string }> = [];
  const newsSources: Array<{ title: string; url: string }> = [];
  const companySources: Array<{ title: string; url: string }> = [];

  for (const entry of evidence.finalEvidence) {
    const label = `${entry.stepTitle} ${entry.query}`;
    const stepSources = entry.sources.map((s) => ({ title: s.title, url: s.url }));

    if (stepMatches(label, FINANCIAL_KEYWORDS)) {
      financialSummaries.push({ stepId: entry.stepId, title: entry.stepTitle, summary: entry.summary });
      financialSources.push(...stepSources);
    } else if (stepMatches(label, NEWS_KEYWORDS)) {
      newsSummaries.push({ stepId: entry.stepId, title: entry.stepTitle, summary: entry.summary });
      newsSources.push(...stepSources);
    } else if (stepMatches(label, COMPANY_KEYWORDS)) {
      companySummaries.push(`**${entry.stepTitle}**\n${entry.summary}`);
      companySources.push(...stepSources);
    } else {
      companySummaries.push(`**${entry.stepTitle}**\n${entry.summary}`);
      companySources.push(...stepSources);
    }
  }

  const company_information: CompanyInformation = {
    ticker: ticker.toUpperCase(),
    summary: companySummaries.join("\n\n") || "No company profile data collected.",
    sources: dedupeSources(companySources).slice(0, 12)
  };

  return {
    company_information,
    financial_data: {
      summaries: financialSummaries,
      sources: dedupeSources(financialSources).slice(0, 12)
    },
    news_data: {
      summaries: newsSummaries,
      sources: dedupeSources(newsSources).slice(0, 12)
    },
    research_context: buildResearchContext(evidence)
  };
}

/**
 * Gathers plan + Tavily research for a ticker and returns a populated ResearchState slice.
 */
export async function collectResearchData(ticker: string): Promise<ResearchState> {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!normalizedTicker) {
    throw new Error("Ticker is required.");
  }

  const project = tickerToProject(normalizedTicker);
  const explicitYear = extractExplicitYear(project);
  const client = createOpenAIClient();

  const plan = await completeJson<ResearchPlan>(client, PLANNING_PROMPT, `Project:\n${project}`);
  const { stepResults, finalEvidence } = await executeResearchSteps(client, {
    project,
    plan,
    explicitYear
  });

  const evidence: ResearchEvidence = { plan, stepResults, finalEvidence };
  const categorized = categorizeEvidence(evidence, normalizedTicker);

  return {
    ticker: normalizedTicker,
    ...categorized,
    bull_thesis: "",
    bear_thesis: "",
    final_recommendation: null
  };
}
