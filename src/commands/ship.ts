import { c, vMark } from "../brand/index.js";
import { patchConfig } from "../config/store.js";
import { runPrompt } from "./run.js";

/** Ship flow — website marketing command (`$ voxiva ship`). */
export async function shipTask(task: string, opts: { model?: string } = {}): Promise<void> {
  console.log(vMark(true));
  console.log("");
  console.log(c.muted("Ship plan — end-to-end delivery"));
  console.log("");

  await patchConfig({ plan: "ship" });

  const wrapped = `Task: ${task}

Deliver this in the current project context.
1) Brief plan (3-5 bullets)
2) Implementation steps
3) Commands to run
4) How to verify`;

  await runPrompt(wrapped, { ...opts, plan: "ship", quiet: true });
}
