import { getEquityResearchGraph } from "@/lib/research/graph";
import { createInitialResearchState } from "@/lib/research/state";
import type {
  EquityResearchDebugResult,
  PortfolioRecommendation,
  ResearchState
} from "@/lib/research/types";

export type EquityResearchPipelineResult = PortfolioRecommendation | EquityResearchDebugResult;

/**
 * Runs the LangGraph equity research workflow for a ticker.
 *
 * @param ticker - Stock symbol (e.g. AAPL)
 * @param debug - When true, returns bull/bear theses and full intermediate state
 */
export async function run_equity_research_pipeline(
  ticker: string,
  debug = false
): Promise<EquityResearchPipelineResult> {
  const graph = getEquityResearchGraph();
  const initialState = createInitialResearchState(ticker);
  const finalState = (await graph.invoke(initialState)) as ResearchState;

  const recommendation = finalState.final_recommendation;
  if (!recommendation) {
    throw new Error("Portfolio manager did not produce a final recommendation.");
  }

  if (debug) {
    return {
      bull_thesis: finalState.bull_thesis,
      bear_thesis: finalState.bear_thesis,
      final_recommendation: recommendation,
      state: finalState
    };
  }

  return recommendation;
}
