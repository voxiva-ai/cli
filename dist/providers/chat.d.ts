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
export declare const DEFAULT_FREE_MODEL: ModelRef;
export declare function listCatalog(): ModelInfo[];
/** Free models for /models — always show full free list (all work keyless). */
export declare function listFreeCatalog(_auth?: AuthStore): ModelInfo[];
export declare function findCatalog(ref: string): ModelInfo | undefined;
export declare function isFreeModelRef(ref: string | undefined): boolean;
export declare function isBuiltinFree(ref: string | undefined): boolean;
/** Provider is ready to call (built-in free never needs a key). */
export declare function providerReady(auth: AuthStore, provider: ProviderId): boolean;
/** Free / built-in can be used without forcing /connect. */
export declare function canUseWithoutKey(ref: string | undefined): boolean;
export declare function parseModelRef(ref: string): {
    provider: ProviderId;
    model: string;
} | null;
export declare function modelRef(info: ModelInfo): ModelRef;
/** Migrate renamed free ids; leave everything else intact. */
export declare function migrateModelRef(ref: string | undefined): ModelRef | undefined;
/**
 * True when we can actually call this model now:
 * - built-in / free catalog → always
 * - catalog paid → needs that provider key
 * - custom OpenRouter / BYOK id not in catalog → needs provider key (keep user's choice)
 */
export declare function isUsableModelRef(ref: string | undefined, auth: AuthStore): ref is ModelRef;
/**
 * Pick model for a new terminal / workspace:
 * workspace last → global default → Big Pickle.
 * Never silently wipe a still-usable choice (DeepSeek Flash, OpenRouter, BYOK, …).
 */
export declare function resolvePreferredModel(opts: {
    auth: AuthStore;
    workspaceModel?: string;
    configModel?: string;
    fallback?: ModelRef;
}): {
    model: ModelRef;
    migrated: boolean;
};
/** Warm TLS/DNS so the first free reply feels instant (OpenCode-like). */
export declare function warmFreeGateway(): void;
export declare function streamChat(auth: AuthStore, modelRefStr: ModelRef, messages: ChatMessage[], handlers: StreamHandlers): Promise<string>;
