import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
export const PROVIDER_IDS = [
    "voxiva",
    "openai",
    "anthropic",
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
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
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
    await writeFile(AUTH_PATH, JSON.stringify(auth, null, 2) + "\n", "utf8");
    try {
        const { chmod } = await import("node:fs/promises");
        await chmod(AUTH_PATH, 0o600);
    }
    catch {
        // Windows may not support chmod the same way — ignore.
    }
}
export function parseModelRef(ref) {
    const slash = ref.indexOf("/");
    if (slash <= 0)
        return null;
    const provider = ref.slice(0, slash);
    const model = ref.slice(slash + 1);
    if (!model)
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
export { dirname, join };
