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
      console.log(c.muted("Free"));
      section = "free";
    } else if (!info.free && section !== "paid") {
      console.log("");
      console.log(c.muted("Paid / BYOK"));
      section = "paid";
    }
    const ref = modelRef(info);
    const active = config.defaultModel === ref;
    const ready = info.builtin || connected.has(info.provider);
    const mark = active ? c.brand("›") : " ";
    const status = info.builtin
      ? c.ok("free · no key")
      : info.free
        ? ready
          ? c.ok("free")
          : c.muted("free · OpenRouter key")
        : ready
          ? c.ok("ready")
          : c.muted("needs auth");
    console.log(
      `${mark} ${c.text(info.label.padEnd(32))} ${c.muted(ref.padEnd(48))} ${status}`,
    );
  }

  console.log("");
  console.log(
    c.muted("Default:"),
    c.brand(config.defaultModel ?? DEFAULT_FREE_MODEL),
  );
  if (!config.defaultModel) {
    console.log(c.muted("Tip:"), c.brand(`voxiva models use ${DEFAULT_FREE_MODEL}`));
  }
}

export async function modelsUse(ref: string): Promise<void> {
  const parsed = parseModelRef(ref);
  if (!parsed) {
    console.error(c.danger(`Use provider/model format, e.g. ${DEFAULT_FREE_MODEL}`));
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
  console.log(config.defaultModel ?? DEFAULT_FREE_MODEL);
}
