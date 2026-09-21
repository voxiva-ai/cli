import ora from "ora";
import { c, promptGlyph } from "../brand/index.js";
import { loadAuth, loadConfig, type ModelRef } from "../config/store.js";
import { getPlan } from "../plans/index.js";
import { streamChat } from "../providers/chat.js";

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

  if (!model) {
    console.error(c.danger("No model selected."));
    console.log(c.muted("Run:"), c.brand("voxiva auth login"), c.muted("then"), c.brand("voxiva models use openai/gpt-4.1-mini"));
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
    { role: "system" as const, content: plan.system },
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
