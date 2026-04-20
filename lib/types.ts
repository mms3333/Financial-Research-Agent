export type StepStatus = "pending" | "in_progress" | "complete" | "error";

export interface ResearchStep {
  id: string;
  title: string;
  description: string;
}

export interface ResearchPlan {
  steps: ResearchStep[];
}

export interface StepExecutionResult {
  stepId: string;
  query: string;
  summary: string;
  sources: Array<{
    title: string;
    url: string;
  }>;
}

export interface TavilyResultItem {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilyResultItem[];
}

export type AgentStreamEvent =
  | { type: "plan"; payload: ResearchPlan }
  | { type: "step-status"; payload: { stepId: string; status: StepStatus } }
  | { type: "step-result"; payload: StepExecutionResult }
  | { type: "final-report-chunk"; payload: { chunk: string } }
  | { type: "final-report-complete"; payload: { report: string } }
  | { type: "error"; payload: { message: string } };
