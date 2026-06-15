// Lớp gọi LLM provider-agnostic cho chatbot (Azure OpenAI / OpenAI-compatible).
// Cấu hình qua env: LLM_PROVIDER, LLM_BASE_URL, LLM_API_KEY, LLM_API_VERSION, LLM_MODEL.
// Tách riêng khỏi RAG để dễ đổi nhà cung cấp mà không đụng logic grounding.

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY && process.env.LLM_BASE_URL);
}

/** Tên model (dùng cho cost-meter/logging); Azure lấy deployment từ URL. */
export function llmModel(): string {
  return process.env.LLM_MODEL ?? "gpt-4o";
}

/**
 * Gọi chat completion 1 lượt, trả về text. Ném lỗi nếu chưa cấu hình hoặc HTTP != 2xx.
 * - Azure: URL .../chat/completions?api-version=..., header `api-key`.
 * - OpenAI-compatible: URL .../chat/completions, header `Authorization: Bearer`.
 */
export async function chatComplete(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; signal?: AbortSignal } = {},
): Promise<string> {
  const base = process.env.LLM_BASE_URL;
  const key = process.env.LLM_API_KEY;
  if (!base || !key) {
    throw new Error("LLM chưa cấu hình (thiếu LLM_BASE_URL/LLM_API_KEY)");
  }
  const provider = (process.env.LLM_PROVIDER ?? "azure").toLowerCase();
  const root = base.replace(/\/+$/, "");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let url: string;
  if (provider === "azure") {
    const version = process.env.LLM_API_VERSION ?? "2025-04-01-preview";
    url = `${root}/chat/completions?api-version=${encodeURIComponent(version)}`;
    headers["api-key"] = key;
  } else {
    url = `${root}/chat/completions`;
    headers["Authorization"] = `Bearer ${key}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: llmModel(),
      messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 800,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM ${res.status}: ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}
