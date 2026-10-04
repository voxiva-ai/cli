import { runTui } from "../tui/index.js";
import { runUpdate } from "./update.js";
export async function chatInteractive() {
    const action = await runTui();
    if (action === "update") {
        process.exitCode = await runUpdate({ force: true });
    }
}
