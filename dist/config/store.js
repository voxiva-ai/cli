import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
export const PROVIDER_IDS = [
    "voxiva",
    "openai",
    "anthropic",
    "opencode",
    "openrouter",
    "google",
    "groq",
    "deepseek",
];
const DIR = join(homedir(), ".voxiva");
const CONFIG_PATH = join(DIR, "config.json");
const AUTH_PATH = join(DIR, "auth.json");
const DEFAULT_CONFIG = {
    version: 1,
    plan: "build",
    theme: "voxiva",
    locale: "en",
    defaultModel: "voxiva/big-pickle",
};
export async function ensureDir() {
    await mkdir(DIR, { recursive: true });
}
/** Replace a persisted file in one step so a crash cannot leave partial JSON. */
export async function writeFileAtomic(path, content, mode) {
    const temp = `${path}.${process.pid}.${randomUUID()}.tmp`;
    try {
        await writeFile(temp, content, { encoding: "utf8", mode });
        await rename(temp, path);
    }
    finally {
        await unlink(temp).catch(() => { });
    }
}
export async function loadConfig() {
    try {
        const raw = await readFile(CONFIG_PATH, "utf8");
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_CONFIG, ...parsed };
    }
    catch {
        return { ...DEFAULT_CONFIG };
    }
}
export async function saveConfig(config) {
    await ensureDir();
    await writeFileAtomic(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n");
}
export async function loadAuth() {
    let stored = {};
    try {
        const raw = await readFile(AUTH_PATH, "utf8");
        stored = JSON.parse(raw);
    }
    catch { }
    const environment = {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        opencode: process.env.OPENCODE_API_KEY,
        openrouter: process.env.OPENROUTER_API_KEY,
        groq: process.env.GROQ_API_KEY,
        google: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
        deepseek: process.env.DEEPSEEK_API_KEY,
    };
    for (const [provider, apiKey] of Object.entries(environment)) {
        if (apiKey && !stored[provider]?.apiKey) {
            stored[provider] = { apiKey };
        }
    }
    return stored;
}
export async function saveAuth(auth) {
    await ensureDir();
    await writeFileAtomic(AUTH_PATH, JSON.stringify(auth, null, 2) + "\n", 0o600);
}
export function parseModelRef(ref) {
    const slash = ref.indexOf("/");
    if (slash <= 0)
        return null;
    const provider = ref.slice(0, slash);
    const model = ref.slice(slash + 1).trim();
    if (!PROVIDER_IDS.includes(provider) || !model)
        return null;
    return { provider, model };
}
export function configDir() {
    return DIR;
}
export function configPath() {
    return CONFIG_PATH;
}
export async function patchConfig(patch) {
    const current = await loadConfig();
    const next = { ...current, ...patch };
    await saveConfig(next);
    return next;
}
/** Persist default model + recent list so a new terminal keeps the same choice. */
export async function rememberModel(ref) {
    const current = await loadConfig();
    const recent = [ref, ...(current.recentModels ?? []).filter((m) => m !== ref)].slice(0, 8);
    return patchConfig({ defaultModel: ref, recentModels: recent });
}
export { dirname, join };
