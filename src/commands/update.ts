import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { c } from "../brand/index.js";
import { VERSION } from "../tui/copy.js";
import { checkForUpdate, clearUpdateCache, reinstallHint } from "../update/check.js";

function prefixDir(): string {
  return process.env.VOXIVA_HOME
    ? join(process.env.VOXIVA_HOME, "prefix")
    : join(homedir(), ".voxiva", "prefix");
}

function runtimeNpm(): string | null {
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
export async function runUpdate(opts: { force?: boolean } = {}): Promise<number> {
  console.log(c.brand("voxiva"), c.muted(`update · current v${VERSION}`));
  console.log("");

  await clearUpdateCache();
  const info = await checkForUpdate(true);
  if (!info && !opts.force) {
    console.log(c.ok("✓"), "Already on the latest version.", c.muted(`v${VERSION}`));
    return 0;
  }
  if (info) {
    console.log(c.ok("↑"), `v${info.current} → v${info.latest}`);
  } else {
    console.log(c.muted("Force reinstall…"));
  }
  console.log("");

  const npmCandidates = [runtimeNpm(), "npm"].filter(Boolean) as string[];
  const prefix = prefixDir();
  let installed = false;

  for (const npm of npmCandidates) {
    console.log(c.muted(`→ ${npm} install --prefix ${prefix} github:voxiva-ai/cli`));
    const result = spawnSync(
      npm,
      [
        "install",
        "--prefix",
        prefix,
        "--no-fund",
        "--no-audit",
        "--silent",
        "github:voxiva-ai/cli",
      ],
      {
        stdio: "inherit",
        shell: process.platform === "win32",
        env: { ...process.env, npm_config_loglevel: "error" },
      },
    );
    if (result.status === 0) {
      installed = true;
      break;
    }
  }

  if (!installed) {
    console.log("");
    console.log(c.muted("npm path failed — running full installer…"));
    const hint = reinstallHint();
    const result =
      process.platform === "win32"
        ? spawnSync(
            "powershell",
            ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", hint],
            { stdio: "inherit" },
          )
        : spawnSync("bash", ["-lc", hint], { stdio: "inherit" });
    if ((result.status ?? 1) !== 0) {
      console.log("");
      console.log(c.danger("Update failed. Run manually:"));
      console.log(c.muted(`  ${hint}`));
      return 1;
    }
  }

  await clearUpdateCache();
  console.log("");
  console.log(c.ok("✓"), "Updated. Restart the app:");
  console.log("");
  console.log(c.brand("  voxiva"));
  console.log("");
  return 0;
}
