import { c } from "../brand/index.js";
import { loadAuth, loadConfig, patchConfig, parseModelRef } from "../config/store.js";
import { DEFAULT_FREE_MODEL, listFreeCatalog, modelRef } from "../providers/chat.js";

export async function modelsList(): Promise<void> {
  const config = await loadConfig();
  const auth = await loadAuth();
  const connected = new Set(
    Object.entries(auth)
      .filter(([, v]) => v?.apiKey)
      .map(([k]) => k),
  );

  console.log(c.bold("Free models\n"));
  for (const info of listFreeCatalog()) {
    const ref = modelRef(info);
    const active = config.defaultModel === ref;
    const ready = connected.has(info.provider);
    const mark = active ? c.brand("›") : " ";
    const status = ready ? c.ok("free") : c.ok("free · no key");
    console.log(
      `${mark} ${c.text(info.label.padEnd(32))} ${c.muted(ref.padEnd(48))} ${status}`,
    );
  }

  console.log("");
  console.log(c.muted("API key (paid)"));
  for (const p of [
    { id: "openai", label: "OpenAI" },
    { id: "anthropic", label: "Anthropic" },
    { id: "google", label: "Google" },
  ] as const) {
    const status = connected.has(p.id) ? c.ok("key ready") : c.muted("paste key via /model");
    console.log(`  ${c.text(p.label.padEnd(12))} ${status}`);
  }

  console.log("");
  console.log(
    c.muted("Default:"),
    c.brand(config.defaultModel ?? DEFAULT_FREE_MODEL),
  );
}

export async function modelsUse(ref: string): Promise<void> {
  const parsed = parseModelRef(ref);
  if (!parsed) {
    console.error(c.danger(`Use provider/model format, e.g. ${DEFAULT_FREE_MODEL}`));
    process.exitCode = 1;
    return;
  }

  const known = listFreeCatalog().some((m) => modelRef(m) === ref);
  if (!known) {
    console.log(c.muted(`Note: ${ref} is not in the free catalog — will still be saved.`));
  }

  await patchConfig({ defaultModel: ref as `${typeof parsed.provider}/${string}` });
  console.log(c.ok(`Default model → ${c.brand(ref)}`));
}

export async function modelsCurrent(): Promise<void> {
  const config = await loadConfig();
  console.log(config.defaultModel ?? DEFAULT_FREE_MODEL);
}
