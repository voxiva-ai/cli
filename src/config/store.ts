import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type ProviderId = "openai" | "anthropic" | "openrouter" | "groq" | "google";

export type PlanId = "build" | "ship" | "check" | "explore";

export type ThemeId = "voxiva" | "slate" | "midnight" | "arctic" | "ember" | "forest" | "mono";

export type LocaleId = import("../i18n/index.js").LocaleId;

export type ModelRef = `${ProviderId}/${string}`;

export type VoxivaConfig = {
  version: 1;
  defaultModel?: ModelRef;
  plan: PlanId;
  theme?: ThemeId;
  locale?: LocaleId;
  cwd?: string;
};

export type AuthStore = Partial<Record<ProviderId, { apiKey: string }>>;

const DIR = join(homedir(), ".voxiva");
const CONFIG_PATH = join(DIR, "config.json");
const AUTH_PATH = join(DIR, "auth.json");

const DEFAULT_CONFIG: VoxivaConfig = {
  version: 1,
  plan: "build",
  theme: "voxiva",
  locale: "en",
};

export async function ensureDir(): Promise<void> {
  await mkdir(DIR, { recursive: true });
}

export async function loadConfig(): Promise<VoxivaConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as VoxivaConfig;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config: VoxivaConfig): Promise<void> {
  await ensureDir();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
}

export async function loadAuth(): Promise<AuthStore> {
  let stored: AuthStore = {};
  try {
    const raw = await readFile(AUTH_PATH, "utf8");
    stored = JSON.parse(raw) as AuthStore;
  } catch {}

  const environment: Partial<Record<ProviderId, string | undefined>> = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    groq: process.env.GROQ_API_KEY,
    google: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
  };

  for (const [provider, apiKey] of Object.entries(environment)) {
    if (apiKey && !stored[provider as ProviderId]?.apiKey) {
      stored[provider as ProviderId] = { apiKey };
    }
  }
  return stored;
}

export async function saveAuth(auth: AuthStore): Promise<void> {
  await ensureDir();
  await writeFile(AUTH_PATH, JSON.stringify(auth, null, 2) + "\n", "utf8");
  try {
    const { chmod } = await import("node:fs/promises");
    await chmod(AUTH_PATH, 0o600);
  } catch {
    // Windows may not support chmod the same way — ignore.
  }
}

export function parseModelRef(ref: string): { provider: ProviderId; model: string } | null {
  const slash = ref.indexOf("/");
  if (slash <= 0) return null;
  const provider = ref.slice(0, slash) as ProviderId;
  const model = ref.slice(slash + 1);
  if (!model) return null;
  return { provider, model };
}

export function configDir(): string {
  return DIR;
}

export function configPath(): string {
  return CONFIG_PATH;
}

export async function patchConfig(patch: Partial<VoxivaConfig>): Promise<VoxivaConfig> {
  const current = await loadConfig();
  const next = { ...current, ...patch };
  await saveConfig(next);
  return next;
}

export { dirname, join };
