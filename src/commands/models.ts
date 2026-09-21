import { c } from "../brand/index.js";
import { loadAuth, loadConfig, patchConfig, parseModelRef } from "../config/store.js";
import { listCatalog, modelRef } from "../providers/chat.js";

export async function modelsList(): Promise<void> {
  const config = await loadConfig();
  const auth = await loadAuth();
  const connected = new Set(
    Object.entries(auth)
      .filter(([, v]) => v?.apiKey)
      .map(([k]) => k),
  );

  console.log(c.bold("Available models\n"));
  for (const info of listCatalog()) {
    const ref = modelRef(info);
    const active = config.defaultModel === ref;
    const ready = connected.has(info.provider);
    const mark = active ? c.brand("›") : " ";
    const status = ready ? c.ok("ready") : c.muted("needs auth");
    console.log(
      `${mark} ${c.text(ref.padEnd(42))} ${c.muted(info.label.padEnd(22))} ${status}`,
    );
  }

  if (!config.defaultModel) {
    console.log("");
    console.log(c.muted("No default model. Run:"), c.brand("voxiva models use openai/gpt-4.1-mini"));
  } else {
    console.log("");
    console.log(c.muted("Default:"), c.brand(config.defaultModel));
  }
}

export async function modelsUse(ref: string): Promise<void> {
  const parsed = parseModelRef(ref);
  if (!parsed) {
    console.error(c.danger("Use provider/model format, e.g. openai/gpt-4.1-mini"));
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
