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
  /** Works with no API key after install (OpenCode-style). */
  builtin?: boolean;
  /** Upstream id for the keyless gateway. */
  upstream?: string;
  /** Prefer this OpenRouter id when an OpenRouter key is present. */
  openrouterId?: string;
};

/**
 * Default after install — OpenCode-style free model, no key.
 */
export const DEFAULT_FREE_MODEL: ModelRef = "voxiva/big-pickle";

const POLLINATIONS_URL = "https://text.pollinations.ai/openai";

/**
 * Free picker mirrors OpenCode Zen free models (names + ids).
 * All `builtin` entries work keyless via the gateway.
 * With an OpenRouter key, verified `openrouterId`s hit the real free model.
 * @see https://opencode.ai/docs/zen/
 */
const CATALOG: ModelInfo[] = [
  // ——— Free (OpenCode Zen · no key) ———
  {
    provider: "voxiva",
    id: "big-pickle",
    label: "Big Pickle",
    free: true,
    builtin: true,
    upstream: "openai-fast",
  },
  {
    provider: "voxiva",
    id: "space-bunny-free",
    label: "Space Bunny Free",
    free: true,
    builtin: true,
    upstream: "openai-fast",
    openrouterId: "stealth/space-bunny-alpha",
  },
  {
    provider: "voxiva",
    id: "longcat-2.5-preview-free",
    label: "LongCat 2.5 Preview Free",
    free: true,
    builtin: true,
    upstream: "openai-fast",
  },
  {
    provider: "voxiva",
    id: "mimo-v2.6-flash-free",
    label: "MiMo-V2.6-Flash Free",
    free: true,
    builtin: true,
    upstream: "openai-fast",
  },
  {
    provider: "voxiva",
    id: "mimo-v2.5-free",
    label: "MiMo-V2.5 Free",
    free: true,
    builtin: true,
    upstream: "openai-fast",
  },
  {
    provider: "voxiva",
    id: "ling-3.0-flash-fin-free",
    label: "Ling 3.0 Flash Fin Free",
    free: true,
    builtin: true,
    upstream: "openai-fast",
    openrouterId: "inclusionai/ling-3.0-flash-sante:free",
  },
  {
    provider: "voxiva",
    id: "nemotron-3-ultra-free",
    label: "Nemotron 3 Ultra Free",
    free: true,
    builtin: true,
    upstream: "openai-fast",
    openrouterId: "nvidia/nemotron-3-ultra-550b-a55b:free",
  },
  {
    provider: "voxiva",
    id: "nemotron-3.5-lightning-free",
    label: "Nemotron 3.5 Lightning Free",
    free: true,
    builtin: true,
    upstream: "openai-fast",
    openrouterId: "nvidia/nemotron-3.5-lightning:free",
  },
  {
    provider: "voxiva",
    id: "muse-spark-1.3-contributor-free",
    label: "Muse Spark 1.3 Contributor Free",
    free: true,
    builtin: true,
    upstream: "openai-fast",
  },
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

/** Free models for /models — always show full free list (all work keyless). */
export function listFreeCatalog(_auth?: AuthStore): ModelInfo[] {
  return CATALOG.filter((model) => model.free);
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

/** Keep recent turns so free/API models stay fast. */
function prepareMessages(messages: ChatMessage[], maxChars = 48_000): ChatMessage[] {
  const system = messages.filter((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");
  const kept: ChatMessage[] = [];
  let budget = maxChars;
  for (let i = rest.length - 1; i >= 0; i--) {
    const msg = rest[i];
    const cost = msg.content.length + 24;
    if (kept.length >= 2 && cost > budget) break;
    kept.unshift(msg);
    budget -= cost;
  }
  const sys = system[0];
  if (!sys) return kept;
  const sysText =
    sys.content.length > 12_000
      ? `${sys.content.slice(0, 12_000)}\n…(system truncated for speed)`
      : sys.content;
  return [{ role: "system", content: sysText }, ...kept];
}

type OpenAIClient = import("openai").default;
type AnthropicClient = import("@anthropic-ai/sdk").default;

const openaiClients = new Map<string, OpenAIClient>();
const anthropicClients = new Map<string, AnthropicClient>();

async function getOpenAIClient(auth: AuthStore, provider: ProviderId): Promise<OpenAIClient> {
  const key = requireKey(auth, provider);
  const cacheKey = `${provider}:${key.slice(0, 12)}`;
  const hit = openaiClients.get(cacheKey);
  if (hit) return hit;

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
    apiKey: key,
    baseURL,
    timeout: 90_000,
    maxRetries: 1,
    ...(provider === "openrouter"
      ? {
          defaultHeaders: {
            "HTTP-Referer": "https://github.com/voxiva-ai/cli",
            "X-Title": "Voxiva CLI",
          },
        }
      : {}),
  });
  openaiClients.set(cacheKey, client);
  return client;
}

async function getAnthropicClient(apiKey: string): Promise<AnthropicClient> {
  const cacheKey = apiKey.slice(0, 12);
  const hit = anthropicClients.get(cacheKey);
  if (hit) return hit;
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 90_000 });
  anthropicClients.set(cacheKey, client);
  return client;
}

async function streamKeylessFree(
  upstream: string,
  messages: ChatMessage[],
  handlers: StreamHandlers,
): Promise<string> {
  const bodyBase = {
    model: upstream || "openai-fast",
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: 0.3,
  };
  const headers = {
    "content-type": "application/json",
    "user-agent": `voxiva-cli/${VERSION}`,
    "x-request-id": randomUUID(),
  };

  let lastError = "Free model unavailable.";

  // 1) Streaming first — short retries for speed
  for (let attempt = 0; attempt < 2; attempt++) {
    if (handlers.signal?.aborted) break;
    if (attempt > 0) await sleep(120 * attempt);
    try {
      const response = await fetch(POLLINATIONS_URL, {
        method: "POST",
        headers: { ...headers, accept: "text/event-stream" },
        body: JSON.stringify({ ...bodyBase, stream: true }),
        signal: withTimeout(handlers.signal, 45_000),
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

  // 2) Non-stream fallback (one fast shot)
  if (!handlers.signal?.aborted) {
    try {
      const response = await fetch(POLLINATIONS_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...bodyBase, stream: false }),
        signal: withTimeout(handlers.signal, 40_000),
      });
      const raw = await response.text();
      if (response.ok && raw.trim() && raw.trim() !== "{}") {
        const parsed = JSON.parse(raw) as {
          choices?: { message?: { content?: string } }[];
        };
        const full = parsed.choices?.[0]?.message?.content?.trim() ?? "";
        if (full) {
          handlers.onToken(full);
          handlers.onDone?.();
          return full;
        }
      }
      lastError = `Free model error (${response.status}).`;
    } catch (err) {
      if (!handlers.signal?.aborted) {
        lastError = err instanceof Error ? err.message : String(err);
      }
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
  const prepared = prepareMessages(messages);

  // Built-in free — OpenRouter when key+mapping, else keyless gateway.
  if (provider === "voxiva" || catalog?.builtin) {
    if (catalog?.openrouterId && providerReady(auth, "openrouter")) {
      try {
        return await streamOpenAICompat(
          auth,
          "openrouter",
          catalog.openrouterId,
          prepared,
          handlers,
        );
      } catch {
        // fall through to keyless
      }
    }
    return streamKeylessFree(catalog?.upstream ?? "openai-fast", prepared, handlers);
  }

  // Legacy openrouter free without key → keyless so chat still works.
  if (catalog?.free && !providerReady(auth, provider)) {
    return streamKeylessFree("openai-fast", prepared, handlers);
  }

  if (provider === "anthropic") {
    return streamAnthropic(requireKey(auth, "anthropic"), model, prepared, handlers);
  }

  try {
    return await streamOpenAICompat(auth, provider, model, prepared, handlers);
  } catch (err) {
    if (catalog?.free) {
      return streamKeylessFree(catalog.upstream ?? "openai-fast", prepared, handlers);
    }
    throw err;
  }
}

async function streamOpenAICompat(
  auth: AuthStore,
  provider: ProviderId,
  model: string,
  messages: ChatMessage[],
  handlers: StreamHandlers,
): Promise<string> {
  const client = await getOpenAIClient(auth, provider);
  const stream = await client.chat.completions.create(
    {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      temperature: 0.3,
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
  const client = await getAnthropicClient(apiKey);

  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system");

  const stream = client.messages.stream(
    {
      model,
      max_tokens: 8192,
      temperature: 0.3,
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
