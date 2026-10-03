import { c } from "../brand/index.js";
import { loadAuth, loadConfig, patchConfig, parseModelRef } from "../config/store.js";
import { DEFAULT_FREE_MODEL, listFreeCatalog, modelRef } from "../providers/chat.js";
export async function modelsList() {
    const config = await loadConfig();
    const auth = await loadAuth();
    const connected = new Set(Object.entries(auth)
        .filter(([, v]) => v?.apiKey)
        .map(([k]) => k));
    console.log(c.bold("Free models (work after install)\n"));
    for (const info of listFreeCatalog(auth)) {
        const ref = modelRef(info);
        const active = config.defaultModel === ref;
        const mark = active ? c.brand("›") : " ";
        const status = info.builtin
            ? c.ok("free · no key")
            : connected.has(info.provider)
                ? c.ok("free")
                : c.muted("needs OpenRouter key");
        console.log(`${mark} ${c.text(info.label.padEnd(32))} ${c.muted(ref.padEnd(48))} ${status}`);
    }
    console.log("");
    console.log(c.muted("API key (paid / more free)"));
    for (const p of [
        { id: "openrouter", label: "OpenRouter" },
        { id: "openai", label: "OpenAI" },
        { id: "anthropic", label: "Anthropic" },
        { id: "google", label: "Google" },
    ]) {
        const status = connected.has(p.id) ? c.ok("key ready") : c.muted("paste key via /model");
        console.log(`  ${c.text(p.label.padEnd(12))} ${status}`);
    }
    console.log("");
    console.log(c.muted("Default:"), c.brand(config.defaultModel ?? DEFAULT_FREE_MODEL));
}
export async function modelsUse(ref) {
    const parsed = parseModelRef(ref);
    if (!parsed) {
        console.error(c.danger(`Use provider/model format, e.g. ${DEFAULT_FREE_MODEL}`));
        process.exitCode = 1;
        return;
    }
    const auth = await loadAuth();
    const known = listFreeCatalog(auth).some((m) => modelRef(m) === ref);
    if (!known) {
        console.log(c.muted(`Note: ${ref} may need an API key — will still be saved.`));
    }
    await patchConfig({ defaultModel: ref });
    console.log(c.ok(`Default model → ${c.brand(ref)}`));
}
export async function modelsCurrent() {
    const config = await loadConfig();
    console.log(config.defaultModel ?? DEFAULT_FREE_MODEL);
}
