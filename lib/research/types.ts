import type { ResearchPlan, StepExecutionResult } from "@/lib/types";

export type RecommendationAction = "LONG" | "SHORT" | "HOLD";

export interface PortfolioRecommendation {
  recommendation: RecommendationAction;
  reasoning: string;
  confidence: number;
}

export interface CompanyInformation {
  name?: string;
  ticker: string;
  sector?: string;
  summary: string;
  sources: Array<{ title: string; url: string }>;
}

export interface FinancialDataBundle {
  summaries: Array<{ stepId: string; title: string; summary: string }>;
  sources: Array<{ title: string; url: string }>;
}

export interface NewsDataBundle {
  summaries: Array<{ stepId: string; title: string; summary: string }>;
  sources: Array<{ title: string; url: string }>;
}

export interface ResearchEvidence {
  plan: ResearchPlan;
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
 * Shared state passed between all LangGraph nodes in the equity research pipeline.
 */
export interface ResearchState {
  ticker: string;
  company_information: CompanyInformation;
  financial_data: FinancialDataBundle;
  news_data: NewsDataBundle;
  research_context: string;
  bull_thesis: string;
  bear_thesis: string;
  final_recommendation: PortfolioRecommendation | null;
}

export interface EquityResearchDebugResult {
  bull_thesis: string;
  bear_thesis: string;
  final_recommendation: PortfolioRecommendation;
  state: ResearchState;
}
