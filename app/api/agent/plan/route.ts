import { PLANNING_PROMPT } from "@/lib/prompts";
import { completeJson, createOpenAIClient } from "@/lib/openai";
import { ResearchPlan } from "@/lib/types";

/**
 * Planning-only endpoint for quickly validating OpenAI integration.
 * POST body: { project: string }
 * Response: { steps: [...] }
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const { project } = (await request.json()) as { project?: string };
    if (!project || !project.trim()) {
      return Response.json({ error: "Project is required." }, { status: 400 });
    }

    const client = createOpenAIClient();
    const plan = await completeJson<ResearchPlan>(client, PLANNING_PROMPT, `Project:\n${project}`);

    return Response.json(plan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate plan.";
    return Response.json({ error: message }, { status: 500 });
  }
}
