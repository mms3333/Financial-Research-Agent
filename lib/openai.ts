import OpenAI from "openai";

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  return new OpenAI({ apiKey });
}

export function extractOpenAIText(response: OpenAI.Chat.Completions.ChatCompletion): string {
  return response.choices[0]?.message?.content?.trim() ?? "";
}

export function parseJsonResponse<T>(text: string): T {
  // Models can wrap JSON in markdown fences or add extra text. Normalize defensively.
  const stripped = text.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(stripped) as T;
  } catch {
    const firstObject = stripped.indexOf("{");
    const lastObject = stripped.lastIndexOf("}");
    if (firstObject !== -1 && lastObject !== -1 && lastObject > firstObject) {
      const candidate = stripped.slice(firstObject, lastObject + 1);
      return JSON.parse(candidate) as T;
    }

    const firstArray = stripped.indexOf("[");
    const lastArray = stripped.lastIndexOf("]");
    if (firstArray !== -1 && lastArray !== -1 && lastArray > firstArray) {
      const candidate = stripped.slice(firstArray, lastArray + 1);
      return JSON.parse(candidate) as T;
    }

    throw new Error("Model response was not valid JSON.");
  }
}

export async function completeJson<T>(
  client: OpenAI,
  system: string,
  user: string,
  maxTokens = 1200
): Promise<T> {
  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  return parseJsonResponse<T>(extractOpenAIText(response));
}

export async function completeText(
  client: OpenAI,
  system: string,
  user: string,
  maxTokens = 2500
): Promise<string> {
  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    temperature: 0.3,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  return extractOpenAIText(response);
}
