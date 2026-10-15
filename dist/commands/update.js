import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { c } from "../brand/index.js";
import { VERSION } from "../tui/copy.js";
import { checkForUpdate, clearUpdateCache, reinstallHint } from "../update/check.js";
function prefixDir() {
    return process.env.VOXIVA_HOME
        ? join(process.env.VOXIVA_HOME, "prefix")
        : join(homedir(), ".voxiva", "prefix");
}
function runtimeNpm() {
    const home = process.env.VOXIVA_HOME ?? join(homedir(), ".voxiva");
    if (process.platform === "win32") {
        const cmd = join(home, "runtime", "current", "npm.cmd");
        return cmd;
    }
    return join(home, "runtime", "current", "bin", "npm");
}
/**
 * Reinstall CLI from GitHub into ~/.voxiva/prefix (same layout as installer).
 * Falls back to the one-line install script.
 */
export async function runUpdate(opts = {}) {
    const report = (message) => opts.onProgress ? opts.onProgress(message) : console.log(message);
    if (!opts.onProgress) {
        console.log(c.brand("voxiva"), c.muted(`update · current v${VERSION}`));
        console.log("");
    }
    report("Checking for updates…");
    await clearUpdateCache();
    const info = await checkForUpdate(true);
    if (!info && !opts.force) {
        report(`Already on the latest version. v${VERSION}`);
        return 0;
    }
    if (!opts.onProgress)
        report(info ? `v${info.current} → v${info.latest}` : "Force reinstall…");
    const npmCandidates = [runtimeNpm(), "npm"].filter(Boolean);
    const prefix = prefixDir();
    let installed = false;
    for (const npm of npmCandidates) {
        report("Downloading Voxiva from GitHub…");
        const result = await new Promise((resolve) => {
            const child = spawn(npm, [
                "install",
                "--prefix",
                prefix,
                "--no-fund",
                "--no-audit",
                "--silent",
                "github:voxiva-ai/cli",
            ], {
                stdio: opts.onProgress ? "ignore" : "inherit",
                shell: process.platform === "win32",
                env: { ...process.env, npm_config_loglevel: "error" },
            });
            child.once("error", () => resolve(1));
            child.once("close", (code) => resolve(code ?? 1));
        });
        if (result === 0) {
            installed = true;
            break;
        }
    }
    if (!installed) {
        report("Trying the Voxiva installer…");
        const hint = reinstallHint();
        const [command, args] = process.platform === "win32"
            ? ["powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", hint]]
            : ["bash", ["-lc", hint]];
        const result = await new Promise((resolve) => {
            const child = spawn(command, [...args], { stdio: opts.onProgress ? "ignore" : "inherit" });
            child.once("error", () => resolve(1));
            child.once("close", (code) => resolve(code ?? 1));
        });
        if (result !== 0) {
            report(opts.onProgress ? "Update failed. Try `voxiva update` in your terminal." : `Update failed. Run manually: ${hint}`);
            return 1;
        }
    }
    await clearUpdateCache();
    report(opts.onProgress ? "Update installed. Restart Voxiva to use it." : "Updated. Restart the app: voxiva");
    return 0;
}
