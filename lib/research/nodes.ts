import {
  BEAR_ANALYST_PROMPT,
  BULL_ANALYST_PROMPT,
  PORTFOLIO_MANAGER_PROMPT
} from "@/lib/prompts";
import { completeJson, createOpenAIClient } from "@/lib/openai";
import { collectResearchData } from "@/lib/research/collect-data";
import type { ResearchStateAnnotation } from "@/lib/research/state";
import type { PortfolioRecommendation, RecommendationAction } from "@/lib/research/types";

type GraphState = typeof ResearchStateAnnotation.State;

function formatStateForAnalyst(state: GraphState): string {
  return [
    `Ticker: ${state.ticker}`,
    `Company Information:\n${JSON.stringify(state.company_information, null, 2)}`,
    `Financial Data:\n${JSON.stringify(state.financial_data, null, 2)}`,
    `News Data:\n${JSON.stringify(state.news_data, null, 2)}`,
    `Research Context:\n${state.research_context}`
  ].join("\n\n");
}

function formatBullBearResponse(thesis: string, extras: Record<string, unknown>): string {
  const extraLines = Object.entries(extras)
    .map(([key, value]) => `**${key}**: ${Array.isArray(value) ? value.join("; ") : String(value)}`)
    .join("\n");
  return extraLines ? `${thesis}\n\n${extraLines}` : thesis;
}

export async function dataCollectionNode(
  state: GraphState
): Promise<Partial<GraphState>> {
  const collected = await collectResearchData(state.ticker);
  return collected;
}

export async function bullAnalystNode(state: GraphState): Promise<Partial<GraphState>> {
  const client = createOpenAIClient();
  const response = await completeJson<{
    thesis: string;
    key_catalysts?: string[];
    target_scenario?: string;
  }>(client, BULL_ANALYST_PROMPT, formatStateForAnalyst(state), 1800);

  const bull_thesis = formatBullBearResponse(response.thesis, {
    "Key catalysts": response.key_catalysts ?? [],
    "Target scenario": response.target_scenario ?? ""
  });

  return { bull_thesis };
}

export async function bearAnalystNode(state: GraphState): Promise<Partial<GraphState>> {
  const client = createOpenAIClient();
  const response = await completeJson<{
    thesis: string;
    key_risks?: string[];
    downside_scenario?: string;
  }>(client, BEAR_ANALYST_PROMPT, formatStateForAnalyst(state), 1800);

  const bear_thesis = formatBullBearResponse(response.thesis, {
    "Key risks": response.key_risks ?? [],
    "Downside scenario": response.downside_scenario ?? ""
  });

  return { bear_thesis };
}

function normalizeRecommendation(value: string): RecommendationAction {
  const upper = value.toUpperCase();
  if (upper === "LONG" || upper === "SHORT" || upper === "HOLD") {
    return upper;
  }
  return "HOLD";
}

export async function portfolioManagerNode(state: GraphState): Promise<Partial<GraphState>> {
  const client = createOpenAIClient();
  const response = await completeJson<{
    recommendation: string;
    reasoning: string;
    confidence: number;
  }>(
    client,
    PORTFOLIO_MANAGER_PROMPT,
    [
      `Ticker: ${state.ticker}`,
      `Bull Thesis:\n${state.bull_thesis}`,
      `Bear Thesis:\n${state.bear_thesis}`,
      `Supporting Research:\n${formatStateForAnalyst(state)}`
    ].join("\n\n"),
    1600
  );

  const final_recommendation: PortfolioRecommendation = {
    recommendation: normalizeRecommendation(response.recommendation),
    reasoning: response.reasoning,
    confidence: Math.min(100, Math.max(0, Math.round(response.confidence)))
  };

  return { final_recommendation };
}
