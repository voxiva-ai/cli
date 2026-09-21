import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { c } from "../brand/index.js";

export function installLocal(): number {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const script =
    process.platform === "win32"
      ? join(root, "scripts", "install.ps1")
      : join(root, "scripts", "install.sh");

  console.log(c.muted("Running installer…"));
  console.log("");

  if (process.platform === "win32") {
    const result = spawnSync(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-Source", root],
      { stdio: "inherit", cwd: root },
    );
    return result.status ?? 1;
  }

  const result = spawnSync("bash", [script, root], { stdio: "inherit", cwd: root });
  return result.status ?? 1;
}
