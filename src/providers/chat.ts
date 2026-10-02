import type { AuthStore, ModelRef, ProviderId } from "../config/store.js";
import { PROVIDER_IDS } from "../config/store.js";
import { VERSION } from "../tui/copy.js";
import { randomUUID } from "node:crypto";

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
  /** $0 catalog entry. */
  free?: boolean;
  /** Keyless built-in (OpenCode-style — works after install). */
  builtin?: boolean;
  /** Upstream id for the free gateway. */
  upstream?: string;
};

/**
 * Default after install — same idea as OpenCode free:
 * pick a model, start coding, no API key.
 */
export const DEFAULT_FREE_MODEL: ModelRef = "voxiva/code";

const POLLINATIONS_URL = "https://text.pollinations.ai/openai";

/**
 * Free picker (OpenCode-style).
 * Built-in entries need no key. OpenRouter `:free` need a free OpenRouter key.
 */
const CATALOG: ModelInfo[] = [
  // ——— Built-in free (no key) ———
  {
    provider: "voxiva",
    id: "code",
    label: "Free Coding",
    free: true,
    builtin: true,
    upstream: "openai-fast",
  },
  {
    provider: "voxiva",
    id: "fast",
    label: "Free Fast",
    free: true,
    builtin: true,
    upstream: "openai-fast",
  },
  // ——— OpenRouter free (optional free account key) ———
  { provider: "openrouter", id: "openrouter/free", label: "Free Models Router", free: true },
  { provider: "openrouter", id: "stealth/space-bunny-alpha", label: "Space Bunny Free", free: true },
  { provider: "openrouter", id: "nvidia/nemotron-3.5-lightning:free", label: "Nemotron 3.5 Lightning Free", free: true },
  { provider: "openrouter", id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron 3 Ultra Free", free: true },
  { provider: "openrouter", id: "inclusionai/ling-3.0-flash-fin:free", label: "Ling 3.0 Flash Fin Free", free: true },
  { provider: "openrouter", id: "cohere/north-mini-code:free", label: "North Mini Code Free", free: true },
  { provider: "openrouter", id: "qwen/qwen3.8-27b:free", label: "Qwen3.8 27B Free", free: true },
  { provider: "openrouter", id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B Free", free: true },
  { provider: "openrouter", id: "z-ai/glm-5.2:free", label: "GLM 5.2 Free", free: true },
  { provider: "openrouter", id: "poolside/laguna-s-2.1:free", label: "Laguna S 2.1 Free", free: true },
  { provider: "openrouter", id: "nex-agi/nex-n2.5-pro:free", label: "Nex N2.5 Pro Free", free: true },
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
  { provider: "deepseek", id: "deepseek-chat", label: "DeepSeek V3" },
  { provider: "deepseek", id: "deepseek-reasoner", label: "DeepSeek R1" },
  { provider: "groq", id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
  { provider: "groq", id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
];

export function listCatalog(): ModelInfo[] {
  return CATALOG;
}

/** Free models for /models. Without OpenRouter key → only built-in (always work). */
export function listFreeCatalog(auth?: AuthStore): ModelInfo[] {
  const builtin = CATALOG.filter((model) => model.builtin);
  const openrouterFree = CATALOG.filter(
    (model) => model.free && model.provider === "openrouter",
  );
  if (auth && providerReady(auth, "openrouter")) {
    return [...builtin, ...openrouterFree];
  }
  return builtin;
}

export function findCatalog(ref: string): ModelInfo | undefined {
  return CATALOG.find((model) => modelRef(model) === ref);
}

export function isFreeModelRef(ref: string | undefined): boolean {
  if (!ref) return false;
  return Boolean(findCatalog(ref)?.free);
}

export function isBuiltinFree(ref: string | undefined): boolean {
  if (!ref) return false;
  return Boolean(findCatalog(ref)?.builtin);
}

/** Provider is ready to call (built-in free never needs a key). */
export function providerReady(auth: AuthStore, provider: ProviderId): boolean {
  if (provider === "voxiva") return true;
  return Boolean(auth[provider]?.apiKey?.trim());
}

/** Free / built-in can be used without forcing /connect. */
export function canUseWithoutKey(ref: string | undefined): boolean {
  if (!ref) return false;
  return isBuiltinFree(ref) || isFreeModelRef(ref);
}

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function streamKeylessFree(
  upstream: string,
  messages: ChatMessage[],
  handlers: StreamHandlers,
): Promise<string> {
  const bodyBase = {
    model: upstream || "openai-fast",
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  };
  const headers = {
    "content-type": "application/json",
    "user-agent": `voxiva-cli/${VERSION}`,
    "x-request-id": randomUUID(),
  };

  let lastError = "Free model unavailable.";

  // 1) Streaming first
  for (let attempt = 0; attempt < 3; attempt++) {
    if (handlers.signal?.aborted) break;
    if (attempt > 0) await sleep(350 * attempt);
    try {
      const response = await fetch(POLLINATIONS_URL, {
        method: "POST",
        headers: { ...headers, accept: "text/event-stream" },
        body: JSON.stringify({ ...bodyBase, stream: true }),
        signal: withTimeout(handlers.signal, 60_000),
      });
      if (response.status === 429 || response.status === 402) {
        lastError = "Free model is busy — retrying…";
        continue;
      }
      if (!response.ok || !response.body) {
        lastError = `Free model error (${response.status}).`;
        break;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      let gotToken = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[];
            };
            const text = json.choices?.[0]?.delta?.content ?? "";
            if (text) {
              gotToken = true;
              full += text;
              handlers.onToken(text);
            }
          } catch {
            // ignore
          }
        }
      }

      if (gotToken && full.trim()) {
        handlers.onDone?.();
        return full;
      }
      lastError = "Empty free-model stream.";
    } catch (err) {
      if (handlers.signal?.aborted) break;
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  // 2) Non-stream fallback
  for (let attempt = 0; attempt < 3; attempt++) {
    if (handlers.signal?.aborted) break;
    if (attempt > 0) await sleep(400 * attempt);
    try {
      const response = await fetch(POLLINATIONS_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...bodyBase, stream: false }),
        signal: withTimeout(handlers.signal, 60_000),
      });
      const raw = await response.text();
      if (response.status === 429 || response.status === 402) {
        lastError = "Free model is busy — retrying…";
        continue;
      }
      if (!response.ok) {
        lastError = `Free model error (${response.status}).`;
        continue;
      }
      if (!raw.trim() || raw.trim() === "{}") {
        lastError = "Empty free-model reply — retrying…";
        continue;
      }
      let parsed: { choices?: { message?: { content?: string } }[] };
      try {
        parsed = JSON.parse(raw) as typeof parsed;
      } catch {
        lastError = "Free model returned invalid JSON.";
        continue;
      }
      const full = parsed.choices?.[0]?.message?.content?.trim() ?? "";
      if (!full) {
        lastError = "Empty free-model reply — retrying…";
        continue;
      }
      handlers.onToken(full);
      handlers.onDone?.();
      return full;
    } catch (err) {
      if (handlers.signal?.aborted) break;
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(lastError);
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
  const catalog = findCatalog(modelRefStr);

  // Built-in free — always keyless (OpenCode-style).
  if (provider === "voxiva" || catalog?.builtin) {
    return streamKeylessFree(catalog?.upstream ?? "openai-fast", messages, handlers);
  }

  // OpenRouter free without key → same keyless gateway so chat still works.
  if (catalog?.free && !providerReady(auth, provider)) {
    return streamKeylessFree("openai-fast", messages, handlers);
  }

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

  try {
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
  } catch (err) {
    if (catalog?.free) {
      return streamKeylessFree("openai-fast", messages, handlers);
    }
    throw err;
  }
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
  stream.on("text", (text) => {
    full += text;
    handlers.onToken(text);
  });
  await stream.finalMessage();
  handlers.onDone?.();
  return full;
}
