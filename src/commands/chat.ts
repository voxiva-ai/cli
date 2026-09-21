import { runTui } from "../tui/index.js";

export async function chatInteractive(): Promise<void> {
  await runTui();
}
