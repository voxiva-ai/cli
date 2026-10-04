import { runTui } from "../tui/index.js";
import { runUpdate } from "./update.js";

export async function chatInteractive(): Promise<void> {
  const action = await runTui();
  if (action === "update") {
    process.exitCode = await runUpdate({ force: true });
  }
}
