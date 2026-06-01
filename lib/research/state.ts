import { Annotation } from "@langchain/langgraph";
import type {
  CompanyInformation,
  FinancialDataBundle,
  NewsDataBundle,
  PortfolioRecommendation
} from "@/lib/research/types";

const emptyCompany = (ticker: string): CompanyInformation => ({
  ticker,
  summary: "",
  sources: []
});

const emptyFinancial: FinancialDataBundle = { summaries: [], sources: [] };
const emptyNews: NewsDataBundle = { summaries: [], sources: [] };

export const ResearchStateAnnotation = Annotation.Root({
  ticker: Annotation<string>,
  company_information: Annotation<CompanyInformation>,
  financial_data: Annotation<FinancialDataBundle>,
  news_data: Annotation<NewsDataBundle>,
  research_context: Annotation<string>,
  bull_thesis: Annotation<string>,
  bear_thesis: Annotation<string>,
  final_recommendation: Annotation<PortfolioRecommendation | null>
});

export function createInitialResearchState(ticker: string): typeof ResearchStateAnnotation.State {
  const normalized = ticker.trim().toUpperCase();
  return {
    ticker: normalized,
    company_information: emptyCompany(normalized),
    financial_data: emptyFinancial,
    news_data: emptyNews,
    research_context: "",
    bull_thesis: "",
    bear_thesis: "",
    final_recommendation: null
  };
}
