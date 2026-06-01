/**
 * LangGraph Studio entrypoint.
 * Exports the compiled graph for @langchain/langgraph-cli (see langgraph.json).
 */
import { buildEquityResearchGraph } from "../lib/research/graph";

/** Registered graph id: `equity_research` in langgraph.json */
export const graph = buildEquityResearchGraph();
