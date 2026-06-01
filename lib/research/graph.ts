import { END, START, StateGraph } from "@langchain/langgraph";
import {
  bearAnalystNode,
  bullAnalystNode,
  dataCollectionNode,
  portfolioManagerNode
} from "@/lib/research/nodes";
import { ResearchStateAnnotation } from "@/lib/research/state";

/**
 * Equity research LangGraph:
 *
 * START → data_collection → (bull_analyst ∥ bear_analyst) → portfolio_manager → END
 */
export function buildEquityResearchGraph() {
  return new StateGraph(ResearchStateAnnotation)
    .addNode("data_collection", dataCollectionNode)
    .addNode("bull_analyst", bullAnalystNode)
    .addNode("bear_analyst", bearAnalystNode)
    .addNode("portfolio_manager", portfolioManagerNode, { defer: true })
    .addEdge(START, "data_collection")
    .addEdge("data_collection", "bull_analyst")
    .addEdge("data_collection", "bear_analyst")
    .addEdge("bull_analyst", "portfolio_manager")
    .addEdge("bear_analyst", "portfolio_manager")
    .addEdge("portfolio_manager", END)
    .compile();
}

let compiledGraph: ReturnType<typeof buildEquityResearchGraph> | null = null;

export function getEquityResearchGraph() {
  if (!compiledGraph) {
    compiledGraph = buildEquityResearchGraph();
  }
  return compiledGraph;
}
