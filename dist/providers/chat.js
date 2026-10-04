import { PROVIDER_IDS } from "../config/store.js";
import { VERSION } from "../tui/copy.js";
import { randomUUID } from "node:crypto";
/**
 * Default after install — OpenCode-style free model, no key.
 */
export const DEFAULT_FREE_MODEL = "voxiva/big-pickle";
/** Keyless OpenAI-compatible gateways (tried in order / raced). */
const FREE_ENDPOINTS = [
    "https://gen.pollinations.ai/v1/chat/completions",
    "https://text.pollinations.ai/openai",
];
/**
 * Free picker mirrors OpenCode Zen free models (names + ids).
 * All `builtin` entries work keyless. With an OpenRouter key, matching
 * `openrouterId` routes to the real free OpenRouter model when possible.
 * @see https://opencode.ai/docs/zen/
 */
const CATALOG = [
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
        id: "fledge-alpha-free",
        label: "Fledge Alpha Free",
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
        id: "ling-3.1-flash-free",
        label: "Ling 3.1 Flash Free",
        free: true,
        builtin: true,
        upstream: "openai-fast",
        openrouterId: "inclusionai/ling-3.0-flash-sante:free",
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
export function listCatalog() {
    return CATALOG;
}
/** Free models for /models — always show full free list (all work keyless). */
export function listFreeCatalog(_auth) {
    return CATALOG.filter((model) => model.free);
}
export function findCatalog(ref) {
    return CATALOG.find((model) => modelRef(model) === ref);
}
export function isFreeModelRef(ref) {
    if (!ref)
        return false;
    return Boolean(findCatalog(ref)?.free);
}
export function isBuiltinFree(ref) {
    if (!ref)
        return false;
    return Boolean(findCatalog(ref)?.builtin);
}
/** Provider is ready to call (built-in free never needs a key). */
export function providerReady(auth, provider) {
    if (provider === "voxiva")
        return true;
    return Boolean(auth[provider]?.apiKey?.trim());
}
/** Free / built-in can be used without forcing /connect. */
export function canUseWithoutKey(ref) {
    if (!ref)
        return false;
    return isBuiltinFree(ref) || isFreeModelRef(ref);
}
export function parseModelRef(ref) {
    const slash = ref.indexOf("/");
    if (slash <= 0)
        return null;
    const provider = ref.slice(0, slash);
    const model = ref.slice(slash + 1).trim();
    if (!model)
        return null;
    if (!PROVIDER_IDS.includes(provider))
        return null;
    return { provider, model };
}
export function modelRef(info) {
    return `${info.provider}/${info.id}`;
}
function requireKey(auth, provider) {
    const key = auth[provider]?.apiKey?.trim();
    if (!key) {
        throw new Error(`No API key for ${provider}. Use /connect in chat.`);
    }
    return key;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function withTimeout(signal, ms) {
    const timeout = AbortSignal.timeout(ms);
    return signal ? AbortSignal.any([signal, timeout]) : timeout;
}
/** Warm TLS/DNS so the first free reply feels instant (OpenCode-like). */
export function warmFreeGateway() {
    for (const url of FREE_ENDPOINTS) {
        void fetch(url, {
            method: "OPTIONS",
            signal: AbortSignal.timeout(4_000),
            headers: { "user-agent": `voxiva-cli/${VERSION}` },
        }).catch(() => { });
    }
}
/** Keep recent turns so free/API models stay fast. */
function prepareMessages(messages, maxChars = 40_000) {
    const system = messages.filter((m) => m.role === "system");
    const rest = messages.filter((m) => m.role !== "system");
    const lastUser = [...rest].reverse().find((m) => m.role === "user");
    const shortChat = (lastUser?.content.length ?? 0) < 100;
    const kept = [];
    let budget = shortChat ? 12_000 : maxChars;
    for (let i = rest.length - 1; i >= 0; i--) {
        const msg = rest[i];
        const cost = msg.content.length + 24;
        if (kept.length >= 2 && cost > budget)
            break;
        kept.unshift(msg);
        budget -= cost;
    }
    const sys = system[0];
    if (!sys)
        return kept;
    let sysText = sys.content;
    if (shortChat) {
        // Drop heavy workspace / FILE protocol for greetings & tiny asks — huge TTFT win.
        sysText = sysText
            .replace(/\nWorkspace:[\s\S]*$/, "")
            .replace(/\nWhen you need to create or change project files[\s\S]*$/i, "")
            .replace(/\n<<<FILE[\s\S]*$/i, "");
        sysText = sysText.slice(0, 3_500);
    }
    else if (sysText.length > 10_000) {
        sysText = `${sysText.slice(0, 10_000)}\n…(system truncated for speed)`;
    }
    return [{ role: "system", content: sysText }, ...kept];
}
const openaiClients = new Map();
const anthropicClients = new Map();
async function getOpenAIClient(auth, provider) {
    const key = requireKey(auth, provider);
    const cacheKey = `${provider}:${key.slice(0, 12)}`;
    const hit = openaiClients.get(cacheKey);
    if (hit)
        return hit;
    const baseURL = provider === "openrouter"
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
async function getAnthropicClient(apiKey) {
    const cacheKey = apiKey.slice(0, 12);
    const hit = anthropicClients.get(cacheKey);
    if (hit)
        return hit;
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 75_000 });
    anthropicClients.set(cacheKey, client);
    return client;
}
async function streamKeylessFree(upstream, messages, handlers) {
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
    for (let attempt = 0; attempt < 2; attempt++) {
        if (handlers.signal?.aborted)
            break;
        if (attempt > 0)
            await sleep(100);
        const raceAbort = new AbortController();
        const signal = withTimeout(handlers.signal ? AbortSignal.any([handlers.signal, raceAbort.signal]) : raceAbort.signal, attempt === 0 ? 28_000 : 45_000);
        let claimedBy = null;
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
                if (done)
                    break;
                if (signal.aborted)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data:"))
                        continue;
                    const data = trimmed.slice(5).trim();
                    if (data === "[DONE]")
                        continue;
                    try {
                        const json = JSON.parse(data);
                        const text = json.choices?.[0]?.delta?.content ?? "";
                        if (!text)
                            continue;
                        if (!isWinner) {
                            if (claimedBy && claimedBy !== url) {
                                throw new Error("lost race");
                            }
                            claimedBy = url;
                            isWinner = true;
                        }
                        full += text;
                        handlers.onToken(text);
                    }
                    catch (err) {
                        if (err instanceof Error && err.message === "lost race")
                            throw err;
                    }
                }
            }
            if (!isWinner || !full.trim())
                throw new Error("Empty free-model stream.");
            return full;
        });
        try {
            const full = await Promise.any(runners);
            raceAbort.abort();
            handlers.onDone?.();
            return full;
        }
        catch (err) {
            raceAbort.abort();
            if (handlers.signal?.aborted)
                break;
            if (err instanceof AggregateError) {
                lastError = err.errors.map((e) => (e instanceof Error ? e.message : String(e))).join(" · ");
            }
            else {
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
                if (!response.ok || !raw.trim() || raw.trim() === "{}")
                    continue;
                const parsed = JSON.parse(raw);
                const full = parsed.choices?.[0]?.message?.content?.trim() ?? "";
                if (!full)
                    continue;
                handlers.onToken(full);
                handlers.onDone?.();
                return full;
            }
            catch (err) {
                if (handlers.signal?.aborted)
                    break;
                lastError = err instanceof Error ? err.message : String(err);
            }
        }
    }
    throw new Error(lastError);
}
async function streamOpenRouterOrKeyless(auth, openrouterId, upstream, messages, handlers) {
    // OpenRouter first (real free model quality); keyless if it errors.
    try {
        return await streamOpenAICompat(auth, "openrouter", openrouterId, messages, handlers);
    }
    catch {
        return streamKeylessFree(upstream, messages, handlers);
    }
}
export async function streamChat(auth, modelRefStr, messages, handlers) {
    const slash = modelRefStr.indexOf("/");
    const provider = modelRefStr.slice(0, slash);
    const model = modelRefStr.slice(slash + 1);
    const catalog = findCatalog(modelRefStr);
    const prepared = prepareMessages(messages);
    // Built-in free — OpenRouter when key+mapping, else keyless gateway.
    if (provider === "voxiva" || catalog?.builtin) {
        const upstream = catalog?.upstream ?? "openai-fast";
        if (catalog?.openrouterId && providerReady(auth, "openrouter")) {
            return streamOpenRouterOrKeyless(auth, catalog.openrouterId, upstream, prepared, handlers);
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
    }
    catch (err) {
        if (catalog?.free) {
            return streamKeylessFree(catalog.upstream ?? "openai-fast", prepared, handlers);
        }
        throw err;
    }
}
async function streamOpenAICompat(auth, provider, model, messages, handlers) {
    const client = await getOpenAIClient(auth, provider);
    const stream = await client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        temperature: 0.2,
    }, { signal: handlers.signal });
    let full = "";
    for await (const chunk of stream) {
        if (handlers.signal?.aborted)
            break;
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
            full += text;
            handlers.onToken(text);
        }
    }
    handlers.onDone?.();
    return full;
}
async function streamAnthropic(apiKey, model, messages, handlers) {
    const client = await getAnthropicClient(apiKey);
    const system = messages.find((m) => m.role === "system")?.content;
    const rest = messages.filter((m) => m.role !== "system");
    const stream = client.messages.stream({
        model,
        max_tokens: 8192,
        temperature: 0.2,
        system: system || undefined,
        messages: rest.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
        })),
    }, { signal: handlers.signal });
    let full = "";
    stream.on("text", (text) => {
        full += text;
        handlers.onToken(text);
    });
    await stream.finalMessage();
    handlers.onDone?.();
    return full;
}
