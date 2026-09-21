import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", process.platform === "win32" ? "install.ps1" : "install.sh");

const result =
  process.platform === "win32"
    ? spawnSync(
        "powershell",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-Source", root],
        { stdio: "inherit", cwd: root },
      )
    : spawnSync("bash", [script, root], { stdio: "inherit", cwd: root });

process.exit(result.status ?? 1);
