import { tavily } from "@tavily/core";
import { TavilySearchResponse } from "@/lib/types";

/**
 * Executes a Tavily search and normalizes the shape for downstream summarization.
 */
export async function searchTavily(query: string): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("Missing TAVILY_API_KEY environment variable.");
  }

  const client = tavily({ apiKey });
  const response = await client.search(query, {
    topic: "general",
    maxResults: 5,
    searchDepth: "advanced",
    includeRawContent: false
  });

  return {
    query,
    results: (response.results ?? []).map((result) => ({
      title: result.title ?? "Untitled source",
      url: result.url ?? "",
      content: result.content ?? "",
      score: result.score
    }))
  };
}
