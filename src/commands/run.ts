import ora from "ora";
import { c, promptGlyph } from "../brand/index.js";
import { loadAuth, loadConfig, type ModelRef } from "../config/store.js";
import { getPlan, planSystem } from "../plans/index.js";
import { streamChat } from "../providers/chat.js";
import type { LocaleId } from "../i18n/index.js";

export type RunOptions = {
  model?: string;
  plan?: string;
  quiet?: boolean;
};

export async function runPrompt(prompt: string, opts: RunOptions = {}): Promise<void> {
  const config = await loadConfig();
  const auth = await loadAuth();
  const model = opts.model ?? config.defaultModel;
  const planId = (opts.plan ?? config.plan) as typeof config.plan;
  const plan = getPlan(planId);
  const locale = (config.locale ?? "en") as LocaleId;

  if (!model) {
    console.error(c.danger("No model selected."));
    console.log(c.muted("Run:"), c.brand("voxiva"), c.muted("then"), c.brand("/connect"), c.muted("and"), c.brand("/models"));
    process.exitCode = 1;
    return;
  }

  if (!opts.quiet) {
    console.log(`${promptGlyph()} ${c.muted(plan.id)} ${c.muted("·")} ${c.muted(model)}`);
    console.log("");
  }

  const spinner = opts.quiet ? null : ora({ text: c.muted("Thinking…"), color: "cyan" }).start();

  let started = false;
  const messages = [
    { role: "system" as const, content: planSystem(planId, locale) },
    { role: "user" as const, content: prompt },
  ];

  try {
    await streamChat(auth, model as ModelRef, messages, {
      onToken: (chunk) => {
        if (spinner && !started) {
          spinner.stop();
          started = true;
        }
        process.stdout.write(chunk);
      },
    });
    if (!started && spinner) spinner.stop();
    process.stdout.write("\n");
  } catch (err) {
    if (spinner) spinner.fail(c.danger("Request failed"));
    const msg = err instanceof Error ? err.message : String(err);
    console.error(c.danger(msg));
    process.exitCode = 1;
  }
}
