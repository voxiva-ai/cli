import ora from "ora";
import { c, promptGlyph } from "../brand/index.js";
import { loadAuth, loadConfig } from "../config/store.js";
import { getPlan, planSystemAsync } from "../plans/index.js";
import { streamChat } from "../providers/chat.js";
import { extractReadPaths, readRequestedFiles, stripReadBlocks } from "../project/files.js";
import { stripFileBlocks } from "../project/edits.js";
export async function runPrompt(prompt, opts = {}) {
    const config = await loadConfig();
    const auth = await loadAuth();
    const model = opts.model ?? config.defaultModel;
    const planId = (opts.plan ?? config.plan);
    const plan = getPlan(planId);
    const locale = (config.locale ?? "en");
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
        { role: "system", content: await planSystemAsync(planId, locale, process.cwd()) },
        { role: "user", content: prompt },
    ];
    try {
        for (let round = 0; round < 3; round++) {
            let reply = "";
            let pending = "";
            let hideReadRequest = false;
            reply = await streamChat(auth, model, messages, {
                onToken: (chunk) => {
                    reply += chunk;
                    if (hideReadRequest)
                        return;
                    pending += chunk;
                    const candidate = pending.trimStart();
                    if ("<<<READ".startsWith(candidate)) {
                        if (candidate.length >= "<<<READ".length)
                            hideReadRequest = true;
                        return;
                    }
                    if (spinner && !started)
                        spinner.stop();
                    started = true;
                    process.stdout.write(pending);
                    pending = "";
                },
            });
            const paths = extractReadPaths(reply);
            if (paths.length && round < 2) {
                messages.push({ role: "assistant", content: reply });
                messages.push({ role: "user", content: await readRequestedFiles(process.cwd(), paths) });
                if (spinner)
                    spinner.text = c.muted("Reading files…");
                continue;
            }
            if (spinner && !started) {
                spinner.stop();
                started = true;
                process.stdout.write(stripReadBlocks(stripFileBlocks(reply)) || reply);
            }
            break;
        }
        if (!started && spinner)
            spinner.stop();
        process.stdout.write("\n");
    }
    catch (err) {
        if (spinner)
            spinner.fail(c.danger("Request failed"));
        const msg = err instanceof Error ? err.message : String(err);
        console.error(c.danger(msg));
        process.exitCode = 1;
    }
}
