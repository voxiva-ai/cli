import type { AuthStore, ModelRef, ProviderId } from "../config/store.js";
import { PROVIDER_IDS } from "../config/store.js";

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
  /** $0 via OpenRouter free tier (still needs a free OpenRouter key). */
  free?: boolean;
};

/** Default free model after connecting OpenRouter — like OpenCode Zen free picks. */
export const DEFAULT_FREE_MODEL: ModelRef = "openrouter/openrouter/free";

/**
 * Built-in picker. Free OpenRouter models first (zero cost, free account key).
 * Any provider/id still works via /model.
 */
const CATALOG: ModelInfo[] = [
  // ——— Free (OpenRouter, $0) ———
  { provider: "openrouter", id: "openrouter/free", label: "Free Models Router", free: true },
  { provider: "openrouter", id: "qwen/qwen3.8-27b:free", label: "Qwen3.8 27B", free: true },
  { provider: "openrouter", id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B", free: true },
  { provider: "openrouter", id: "google/gemma-4-26b-a4b-it:free", label: "Gemma 4 26B", free: true },
  { provider: "openrouter", id: "z-ai/glm-5.2:free", label: "GLM 5.2", free: true },
  { provider: "openrouter", id: "cohere/north-mini-code:free", label: "North Mini Code", free: true },
  { provider: "openrouter", id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super", free: true },
  { provider: "openrouter", id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron 3 Ultra", free: true },
  { provider: "openrouter", id: "nvidia/nemotron-3.5-lightning:free", label: "Nemotron 3.5 Lightning", free: true },
  { provider: "openrouter", id: "poolside/laguna-s-2.1:free", label: "Laguna S 2.1", free: true },
  { provider: "openrouter", id: "nex-agi/nex-n2.5-pro:free", label: "Nex N2.5 Pro", free: true },
  { provider: "openrouter", id: "nex-agi/nex-n2.5-mini:free", label: "Nex N2.5 Mini", free: true },
  { provider: "openrouter", id: "inclusionai/ling-3.0-flash-vl:free", label: "Ling 3.0 Flash", free: true },
  // ——— Paid / BYOK ———
  { provider: "openai", id: "gpt-4.1", label: "GPT-4.1" },
  { provider: "openai", id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { provider: "openai", id: "gpt-4o", label: "GPT-4o" },
  { provider: "openai", id: "gpt-4o-mini", label: "GPT-4o Mini" },
  { provider: "openai", id: "o3-mini", label: "o3-mini" },
  { provider: "openai", id: "o4-mini", label: "o4-mini" },
  { provider: "anthropic", id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { provider: "anthropic", id: "claude-opus-4-20250514", label: "Claude Opus 4" },
  { provider: "anthropic", id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  { provider: "google", id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { provider: "google", id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { provider: "google", id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { provider: "google", id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
  { provider: "deepseek", id: "deepseek-chat", label: "DeepSeek V3" },
  { provider: "deepseek", id: "deepseek-reasoner", label: "DeepSeek R1" },
  { provider: "groq", id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { provider: "groq", id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
  { provider: "groq", id: "qwen/qwen3-32b", label: "Qwen3 32B" },
  { provider: "openrouter", id: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3 (OR)" },
  { provider: "openrouter", id: "deepseek/deepseek-r1", label: "DeepSeek R1 (OR)" },
  { provider: "openrouter", id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (OR)" },
  { provider: "openrouter", id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (OR)" },
  { provider: "openrouter", id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4 (OR)" },
  { provider: "openrouter", id: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini (OR)" },
];

export function listCatalog(): ModelInfo[] {
  return CATALOG;
}

export function listFreeCatalog(): ModelInfo[] {
  return CATALOG.filter((model) => model.free);
}

export function isFreeModelRef(ref: string | undefined): boolean {
  if (!ref) return false;
  return CATALOG.some((model) => model.free && modelRef(model) === ref);
}

/** Accept any provider/id string — catalog is only a picker, not a whitelist. */
export function parseModelRef(ref: string): { provider: ProviderId; model: string } | null {
  const slash = ref.indexOf("/");
  if (slash <= 0) return null;
  const provider = ref.slice(0, slash) as ProviderId;
  const model = ref.slice(slash + 1).trim();
  if (!model) return null;
  if (!PROVIDER_IDS.includes(provider)) return null;
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
          : provider === "deepseek"
            ? "https://api.deepseek.com"
            : undefined;

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({
    apiKey: requireKey(auth, provider),
    baseURL,
    ...(provider === "openrouter"
      ? {
          defaultHeaders: {
            "HTTP-Referer": "https://github.com/voxiva-ai/cli",
            "X-Title": "Voxiva CLI",
          },
        }
      : {}),
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
