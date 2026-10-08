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
};

/**
 * Default after install — OpenCode-style free model, no key.
 */
export const DEFAULT_FREE_MODEL: ModelRef = "voxiva/big-pickle";

/** Anonymous OpenAI-compatible gateway. */
const FREE_ENDPOINTS = [
  "https://text.pollinations.ai/openai",
] as const;

/**
 * Free picker mirrors OpenCode Zen zero-cost models (models.dev / opencode).
 * All `builtin` entries work keyless, with an OpenCode Zen key preferred when present.
 * @see https://github.com/anomalyco/opencode
 * @see https://models.dev/providers/opencode
 */
const OPENCODE_FREE: { id: string; label: string }[] = [
  { id: "big-pickle", label: "Big Pickle" },
  { id: "space-bunny-free", label: "Space Bunny Free" },
  { id: "longcat-2.5-preview-free", label: "LongCat 2.5 Preview Free" },
  { id: "step-5-preview-free", label: "Step 5 Preview Free" },
  { id: "exo-free", label: "Exo Free" },
  { id: "mimo-v2.5-free", label: "MiMo V2.5 Free" },
  { id: "mimo-v2.6-flash-free", label: "MiMo-V2.6-Flash Free" },
  { id: "ling-3.1-flash-free", label: "Ling 3.1 Flash Free" },
  { id: "ling-3.0-flash-fin-free", label: "Ling 3.0 Flash Fin Free" },
  { id: "nemotron-3-ultra-free", label: "Nemotron 3 Ultra Free" },
  { id: "nemotron-3.5-lightning-free", label: "Nemotron 3.5 Lightning Free" },
];

const CATALOG: ModelInfo[] = [
  ...OPENCODE_FREE.map(
    (m): ModelInfo => ({
      provider: "voxiva",
      id: m.id,
      label: m.label,
      free: true,
      builtin: true,
      upstream: "openai-fast",
    }),
  ),
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

/** Old short free ids → current OpenCode-style free catalog. */
const LEGACY_MODEL_MAP: Record<string, ModelRef> = {
  "voxiva/code": DEFAULT_FREE_MODEL,
  "voxiva/fast": DEFAULT_FREE_MODEL,
  "voxiva/space-bunny": "voxiva/space-bunny-free",
  "voxiva/ling-3.0-flash": "voxiva/ling-3.0-flash-free",
  "voxiva/mimo-v2.5": "voxiva/mimo-v2.5-free",
  "voxiva/mimo-v2.6-flash": "voxiva/mimo-v2.6-flash-free",
  "voxiva/longcat-2.5": "voxiva/longcat-2.5-preview-free",
  "voxiva/muse-spark": DEFAULT_FREE_MODEL,
  "voxiva/north-mini-code": DEFAULT_FREE_MODEL,
  "voxiva/qwen3.8-27b": DEFAULT_FREE_MODEL,
  "voxiva/gemma-4-31b": DEFAULT_FREE_MODEL,
  "voxiva/glm-5.2": DEFAULT_FREE_MODEL,
  "voxiva/nemotron-3.5-lightning": "voxiva/nemotron-3.5-lightning-free",
  "voxiva/nemotron-3-ultra": "voxiva/nemotron-3-ultra-free",
};

/** Migrate renamed or retired built-in ids; leave external providers intact. */
export function migrateModelRef(ref: string | undefined): ModelRef | undefined {
  if (!ref) return undefined;
  const mapped = LEGACY_MODEL_MAP[ref];
  if (mapped) return mapped;
  if (ref.startsWith("voxiva/") && !findCatalog(ref)) return DEFAULT_FREE_MODEL;
  if (!parseModelRef(ref)) return undefined;
  return ref as ModelRef;
}

/**
 * True when we can actually call this model now:
 * - built-in / free catalog → always
 * - catalog paid → needs that provider key
 * - custom OpenRouter / BYOK id not in catalog → needs provider key (keep user's choice)
 */
export function isUsableModelRef(ref: string | undefined, auth: AuthStore): ref is ModelRef {
  const migrated = migrateModelRef(ref);
  if (!migrated) return false;
  const parsed = parseModelRef(migrated);
  if (!parsed) return false;
  if (canUseWithoutKey(migrated)) return true;
  const catalog = findCatalog(migrated);
  if (catalog?.free && !catalog.builtin) {
    return providerReady(auth, parsed.provider);
  }
  if (catalog) return providerReady(auth, parsed.provider);
  // Not in catalog (e.g. openrouter/… or a new deepseek id) — keep if keyed.
  if (parsed.provider === "voxiva") return false;
  return providerReady(auth, parsed.provider);
}

/**
 * Pick model for a new terminal / workspace:
 * workspace last → global default → Big Pickle.
 * Never silently wipe a still-usable choice (DeepSeek Flash, OpenRouter, BYOK, …).
 */
export function resolvePreferredModel(opts: {
  auth: AuthStore;
  workspaceModel?: string;
  configModel?: string;
  fallback?: ModelRef;
}): { model: ModelRef; migrated: boolean } {
  const fallback = opts.fallback ?? DEFAULT_FREE_MODEL;
  const originals = [opts.workspaceModel, opts.configModel, fallback].filter(
    (ref): ref is string => Boolean(ref),
  );
  const seen = new Set<string>();
  for (const original of originals) {
    const candidate = migrateModelRef(original);
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    if (!isUsableModelRef(candidate, opts.auth)) continue;
    return { model: candidate, migrated: candidate !== original };
  }
  return { model: fallback, migrated: true };
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

/** Warm TLS/DNS so the first free reply feels instant (OpenCode-like). */
export function warmFreeGateway(): void {
  for (const url of FREE_ENDPOINTS) {
    void fetch(url, {
      method: "OPTIONS",
      signal: AbortSignal.timeout(4_000),
      headers: { "user-agent": `voxiva-cli/${VERSION}` },
    }).catch(() => {});
  }
}

const CASUAL_RE =
  /^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay|да|нет|ок|привет|здравств[а-я]*|хай|你好|hola|bonjour|merci)[\s!.?…]*$/i;

/** Keep recent turns so free/API models stay fast (OpenCode-like TTFT). */
function prepareMessages(messages: ChatMessage[], maxChars = 40_000): ChatMessage[] {
  const system = messages.filter((m) => m.role === "system");
  const rest = messages.filter((m) => m.role !== "system");
  const lastUser = [...rest].reverse().find((m) => m.role === "user");
  const lastText = (lastUser?.content ?? "").trim();
  const casual = CASUAL_RE.test(lastText);
  const shortChat = casual || lastText.length < 80;

  const kept: ChatMessage[] = [];
  let budget = casual ? 2_000 : shortChat ? 8_000 : maxChars;
  const maxKept = casual ? 1 : shortChat ? 2 : 40;
  for (let i = rest.length - 1; i >= 0; i--) {
    const msg = rest[i];
    const cost = msg.content.length + 24;
    if (kept.length >= maxKept) break;
    if (kept.length >= 1 && cost > budget) break;
    kept.unshift(msg);
    budget -= cost;
  }

  const sys = system[0];
  if (!sys) return kept;

  let sysText = sys.content;
  if (shortChat) {
    // Drop heavy workspace / FILE / memory for greetings & tiny asks — huge TTFT win.
    sysText = sysText
      .replace(/\nWorkspace:[\s\S]*$/i, "")
      .replace(/\nUser memory[\s\S]*$/i, "")
      .replace(/\n## AGENTS\.md[\s\S]*$/i, "")
      .replace(/\nAGENTS\.md[\s\S]*$/i, "")
      .replace(/\nWhen you need to create or change project files[\s\S]*$/i, "")
      .replace(/\n<<<FILE[\s\S]*$/i, "");
    sysText = sysText.slice(0, casual ? 1_600 : 2_800);
  } else if (sysText.length > 10_000) {
    sysText = `${sysText.slice(0, 10_000)}\n…(system truncated for speed)`;
  }

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
    provider === "opencode"
      ? "https://opencode.ai/zen/v1"
      : provider === "openrouter"
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
    timeout: 75_000,
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
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 75_000 });
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
    temperature: 0.2,
    stream: true,
  };
  const headers = {
    "content-type": "application/json",
    accept: "text/event-stream",
    "user-agent": `voxiva-cli/${VERSION}`,
    "x-request-id": randomUUID(),
  };

  let lastError = "Free model unavailable.";

  // Race endpoints: first token claims the stream (no interleaved junk).
  for (let attempt = 0; attempt < 1; attempt++) {
    if (handlers.signal?.aborted) break;

    const raceAbort = new AbortController();
    const signal = withTimeout(
      handlers.signal ? AbortSignal.any([handlers.signal, raceAbort.signal]) : raceAbort.signal,
      35_000,
    );

    let claimedBy: string | null = null;
    const runners = FREE_ENDPOINTS.map(async (url) => {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyBase),
        signal,
      });
      if (response.status === 429 || response.status === 402) {
        throw new Error("Free model is busy");
      }
      if (!response.ok || !response.body) {
        throw new Error(`Free model error (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";
      let isWinner = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (signal.aborted) break;
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
            if (!text) continue;
            if (!isWinner) {
              if (claimedBy && claimedBy !== url) {
                throw new Error("lost race");
              }
              claimedBy = url;
              isWinner = true;
            }
            full += text;
            handlers.onToken(text);
          } catch (err) {
            if (err instanceof Error && err.message === "lost race") throw err;
          }
        }
      }

      if (!isWinner || !full.trim()) throw new Error("Empty free-model stream.");
      return full;
    });

    try {
      const full = await Promise.any(runners);
      raceAbort.abort();
      handlers.onDone?.();
      return full;
    } catch (err) {
      raceAbort.abort();
      if (handlers.signal?.aborted) break;
      if (err instanceof AggregateError) {
        lastError = err.errors.map((e) => (e instanceof Error ? e.message : String(e))).join(" · ");
      } else {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
  }

  // Non-stream fallback
  if (!handlers.signal?.aborted) {
    for (const url of FREE_ENDPOINTS) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "user-agent": `voxiva-cli/${VERSION}`,
            "x-request-id": randomUUID(),
          },
          body: JSON.stringify({ ...bodyBase, stream: false }),
          signal: withTimeout(handlers.signal, 35_000),
        });
        const raw = await response.text();
        if (!response.ok || !raw.trim() || raw.trim() === "{}") continue;
        const parsed = JSON.parse(raw) as {
          choices?: { message?: { content?: string } }[];
        };
        const full = parsed.choices?.[0]?.message?.content?.trim() ?? "";
        if (!full) continue;
        handlers.onToken(full);
        handlers.onDone?.();
        return full;
      } catch (err) {
        if (handlers.signal?.aborted) break;
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
  }

  throw new Error(
    `Free gateway is busy (${lastError}). Use /connect → OpenCode Zen for reliable free models.`,
  );
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
  const prepared = prepareMessages(
    messages,
    provider === "voxiva" && !providerReady(auth, "opencode") ? 12_000 : 40_000,
  );

  // Built-in free — real OpenCode model when connected, anonymous fallback otherwise.
  if (provider === "voxiva" || catalog?.builtin) {
    const upstream = catalog?.upstream ?? "openai-fast";
    if (catalog && providerReady(auth, "opencode")) {
      return streamOpenAICompat(auth, "opencode", catalog.id, prepared, handlers);
    }
    return streamKeylessFree(upstream, prepared, handlers);
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
      temperature: 0.2,
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
      temperature: 0.2,
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
