import { REPORT_FEEDBACK_PROMPT } from "@/lib/prompts";
import { completeText, createOpenAIClient } from "@/lib/openai";
import { StepExecutionResult } from "@/lib/types";

interface RefineRequest {
  project?: string;
  currentReport?: string;
  feedback?: string;
  stepResults?: StepExecutionResult[];
}

/**
 * Applies user feedback to regenerate an improved integrated report.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as RefineRequest;
    const project = body.project?.trim();
    const currentReport = body.currentReport?.trim();
    const feedback = body.feedback?.trim();
    const stepResults = body.stepResults ?? [];

    if (!project || !currentReport || !feedback) {
      return Response.json(
        { error: "project, currentReport, and feedback are required." },
        { status: 400 }
      );
    }

    const client = createOpenAIClient();
    const updatedReport = await completeText(
      client,
      REPORT_FEEDBACK_PROMPT,
      [
        `Project:\n${project}`,
        `Current Report:\n${currentReport}`,
        `User Feedback:\n${feedback}`,
        `Step Findings and Sources:\n${JSON.stringify(stepResults, null, 2)}`
      ].join("\n\n"),
      3200
    );

    return Response.json({ report: updatedReport });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refine report.";
    return Response.json({ error: message }, { status: 500 });
  }
}
