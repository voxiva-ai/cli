import type { AuthStore, ModelRef, ProviderId } from "../config/store.js";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type StreamHandlers = {
  onToken: (chunk: string) => void;
  onDone?: () => void;
  signal?: AbortSignal;
};

export type ModelInfo = {
  id: string;
  provider: ProviderId;
  label: string;
};

const CATALOG: ModelInfo[] = [
  { provider: "openai", id: "gpt-4.1", label: "GPT-4.1" },
  { provider: "openai", id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { provider: "openai", id: "gpt-4o", label: "GPT-4o" },
  { provider: "openai", id: "o3-mini", label: "o3-mini" },
  { provider: "openai", id: "o4-mini", label: "o4-mini" },
  { provider: "anthropic", id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { provider: "anthropic", id: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { provider: "anthropic", id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  { provider: "openrouter", id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4 (OR)" },
  { provider: "openrouter", id: "openai/gpt-4.1", label: "GPT-4.1 (OR)" },
  { provider: "openrouter", id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (OR)" },
  { provider: "groq", id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { provider: "google", id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { provider: "google", id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

export function listCatalog(): ModelInfo[] {
  return CATALOG;
}

/** Accept any provider/id string — catalog is only a picker, not a whitelist. */
export function parseModelRef(ref: string): { provider: ProviderId; model: string } | null {
  const slash = ref.indexOf("/");
  if (slash <= 0) return null;
  const provider = ref.slice(0, slash) as ProviderId;
  const model = ref.slice(slash + 1).trim();
  if (!model) return null;
  const known: ProviderId[] = ["openai", "anthropic", "openrouter", "google", "groq"];
  if (!known.includes(provider)) return null;
  return { provider, model };
}

export function modelRef(info: ModelInfo): ModelRef {
  return `${info.provider}/${info.id}`;
}

function requireKey(auth: AuthStore, provider: ProviderId): string {
  const key = auth[provider]?.apiKey?.trim();
  if (!key) {
    throw new Error(`No API key for ${provider}. Use /connect in chat.`);
  }
  return key;
}

export async function streamChat(
  auth: AuthStore,
  modelRefStr: ModelRef,
  messages: ChatMessage[],
  handlers: StreamHandlers,
): Promise<string> {
  const slash = modelRefStr.indexOf("/");
  const provider = modelRefStr.slice(0, slash) as ProviderId;
  const model = modelRefStr.slice(slash + 1);

  if (provider === "anthropic") {
    return streamAnthropic(requireKey(auth, "anthropic"), model, messages, handlers);
  }

  const baseURL =
    provider === "openrouter"
      ? "https://openrouter.ai/api/v1"
      : provider === "groq"
        ? "https://api.groq.com/openai/v1"
        : provider === "google"
          ? "https://generativelanguage.googleapis.com/v1beta/openai"
          : undefined;

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey: requireKey(auth, provider === "openrouter" || provider === "groq" || provider === "google" ? provider : "openai"),
    baseURL,
  });

  const stream = await client.chat.completions.create(
    {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    },
    { signal: handlers.signal },
  );

  let full = "";
  for await (const chunk of stream) {
    if (handlers.signal?.aborted) break;
    const text = chunk.choices[0]?.delta?.content ?? "";
    if (text) {
      full += text;
      handlers.onToken(text);
    }
  }
  handlers.onDone?.();
  return full;
}

async function streamAnthropic(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  handlers: StreamHandlers,
): Promise<string> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system");

  const stream = client.messages.stream(
    {
      model,
      max_tokens: 8192,
      system: system || undefined,
      messages: rest.map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    },
    { signal: handlers.signal },
  );

  let full = "";
  for await (const event of stream) {
    if (handlers.signal?.aborted) break;
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const text = event.delta.text;
      full += text;
      handlers.onToken(text);
    }
  }
  handlers.onDone?.();
  return full;
}
