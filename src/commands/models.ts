import { c } from "../brand/index.js";
import { loadAuth, loadConfig, patchConfig, parseModelRef } from "../config/store.js";
import { DEFAULT_FREE_MODEL, listCatalog, modelRef } from "../providers/chat.js";

export async function modelsList(): Promise<void> {
  const config = await loadConfig();
  const auth = await loadAuth();
  const connected = new Set(
    Object.entries(auth)
      .filter(([, v]) => v?.apiKey)
      .map(([k]) => k),
  );

  console.log(c.bold("Available models\n"));
  let section: "none" | "free" | "paid" = "none";
  for (const info of listCatalog()) {
    if (info.free && section !== "free") {
      console.log(c.muted("Free ($0 via OpenRouter)"));
      section = "free";
    } else if (!info.free && section !== "paid") {
      console.log("");
      console.log(c.muted("Paid / BYOK"));
      section = "paid";
    }
    const ref = modelRef(info);
    const active = config.defaultModel === ref;
    const ready = connected.has(info.provider);
    const mark = active ? c.brand("›") : " ";
    const status = info.free
      ? ready
        ? c.ok("free")
        : c.muted("free · needs OpenRouter key")
      : ready
        ? c.ok("ready")
        : c.muted("needs auth");
    console.log(
      `${mark} ${c.text(info.label.padEnd(28))} ${c.muted(ref.padEnd(46))} ${status}`,
    );
  }

  if (!config.defaultModel) {
    console.log("");
    console.log(
      c.muted("No default. Free start:"),
      c.brand("voxiva auth login"),
      c.muted("→ OpenRouter, then"),
      c.brand(`voxiva models use ${DEFAULT_FREE_MODEL}`),
    );
  } else {
    console.log("");
    console.log(c.muted("Default:"), c.brand(config.defaultModel));
  }
}

export async function modelsUse(ref: string): Promise<void> {
  const parsed = parseModelRef(ref);
  if (!parsed) {
    console.error(c.danger("Use provider/model format, e.g. openrouter/openrouter/free"));
    process.exitCode = 1;
    return;
  }

  const catalog = listCatalog();
  const known = catalog.some((m) => modelRef(m) === ref);
  if (!known) {
    console.log(c.muted(`Note: ${ref} is not in the built-in catalog — will still be saved.`));
  }

  await patchConfig({ defaultModel: ref as `${typeof parsed.provider}/${string}` });
  console.log(c.ok(`Default model → ${c.brand(ref)}`));
}

export async function modelsCurrent(): Promise<void> {
  const config = await loadConfig();
  if (config.defaultModel) {
    console.log(config.defaultModel);
  }
}
