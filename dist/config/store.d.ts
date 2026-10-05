import { dirname, join } from "node:path";
export type ProviderId = "voxiva" | "openai" | "anthropic" | "openrouter" | "groq" | "google" | "deepseek";
export declare const PROVIDER_IDS: ProviderId[];
export type PlanId = "build" | "ship" | "check" | "explore";
export type ThemeId = "voxiva" | "slate" | "midnight" | "arctic" | "ember" | "forest" | "mono";
export type LocaleId = import("../i18n/index.js").LocaleId;
export type ModelRef = `${ProviderId}/${string}`;
export type VoxivaConfig = {
    version: 1;
    defaultModel?: ModelRef;
    /** Recently chosen models (newest first), kept across terminals. */
    recentModels?: ModelRef[];
    plan: PlanId;
    theme?: ThemeId;
    locale?: LocaleId;
    cwd?: string;
    /** Last session id for /continue */
    lastSessionId?: string;
};
export type AuthStore = Partial<Record<ProviderId, {
    apiKey: string;
}>>;
export declare function ensureDir(): Promise<void>;
export declare function loadConfig(): Promise<VoxivaConfig>;
export declare function saveConfig(config: VoxivaConfig): Promise<void>;
export declare function loadAuth(): Promise<AuthStore>;
export declare function saveAuth(auth: AuthStore): Promise<void>;
export declare function parseModelRef(ref: string): {
    provider: ProviderId;
    model: string;
} | null;
export declare function configDir(): string;
export declare function configPath(): string;
export declare function patchConfig(patch: Partial<VoxivaConfig>): Promise<VoxivaConfig>;
/** Persist default model + recent list so a new terminal keeps the same choice. */
export declare function rememberModel(ref: ModelRef): Promise<VoxivaConfig>;
export { dirname, join };
