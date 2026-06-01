import { run_equity_research_pipeline } from "@/lib/research/pipeline";

/**
 * POST /api/equity-research
 * Body: { ticker: string, debug?: boolean }
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { ticker?: string; debug?: boolean };
    const ticker = body.ticker?.trim();
    if (!ticker) {
      return Response.json({ error: "ticker is required." }, { status: 400 });
    }

    const result = await run_equity_research_pipeline(ticker, body.debug === true);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Equity research pipeline failed.";
    return Response.json({ error: message }, { status: 500 });
  }
}
