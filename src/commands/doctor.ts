import { execSync } from "node:child_process";
import { c, vMark } from "../brand/index.js";
import { configDir, loadAuth, loadConfig } from "../config/store.js";
import { VERSION } from "../tui/copy.js";
import { checkForUpdate } from "../update/check.js";

function hasCommand(name: string): boolean {
  try {
    if (process.platform === "win32") {
      execSync(`where ${name}`, { stdio: "ignore" });
    } else {
      execSync(`command -v ${name}`, { stdio: "ignore" });
    }
    return true;
  } catch {
    return false;
  }
}

export async function doctorCheck(): Promise<number> {
  console.log(vMark(true));
  console.log("");

  let ok = true;
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  const nodeOk = nodeMajor >= 20;
  console.log(`${nodeOk ? c.ok("✓") : c.danger("✗")} Node.js ${process.versions.node}${nodeOk ? "" : " (need 20+)"}`);
  if (!nodeOk) ok = false;

  const cliOk = hasCommand("voxiva");
  console.log(`${cliOk ? c.ok("✓") : c.danger("✗")} voxiva on PATH`);
  if (!cliOk) ok = false;

  const config = await loadConfig();
  const auth = await loadAuth();
  const providers = Object.keys(auth).filter((k) => auth[k as keyof typeof auth]?.apiKey);

  console.log(`${config.defaultModel ? c.ok("✓") : c.muted("·")} Model ${config.defaultModel ?? "voxiva/big-pickle (default free)"}`);
  console.log(
    `${providers.length ? c.ok("✓") : c.ok("✓")} Providers ${providers.length ? providers.join(", ") : "free · no key"}`,
  );
  console.log(`${c.muted("·")} Config ${configDir()}`);
  console.log(`${c.muted("·")} Plan ${config.plan}`);
  console.log(`${c.muted("·")} Version v${VERSION}`);

  const update = await checkForUpdate(true);
  if (update) {
    console.log(`${c.ok("↑")} Update v${update.latest} available`);
    console.log(c.muted(`  run: voxiva update`));
  } else {
    console.log(`${c.ok("✓")} Up to date`);
  }

  console.log("");
  if (!ok) {
    console.log(c.danger("Fix install:"));
    if (process.platform === "win32") {
      console.log(c.muted("  irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex"));
    } else {
      console.log(c.muted("  curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash"));
    }
    return 1;
  }

  console.log(
    c.ok("Ready."),
    c.brand("voxiva"),
    c.muted("— free models work without keys. Update anytime: voxiva update"),
  );
  return 0;
}
