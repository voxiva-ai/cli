import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const tsc = spawnSync(process.execPath, [resolve(root, "node_modules/typescript/bin/tsc")], {
  cwd: root,
  stdio: "inherit",
});
if (tsc.status !== 0) process.exit(tsc.status ?? 1);

let commit = process.env.GITHUB_SHA ?? "";
try {
  commit ||= execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
} catch {
  // Builds outside a git checkout can still use version-based updates.
}
await mkdir(resolve(root, "dist"), { recursive: true });
await writeFile(resolve(root, "dist/build.json"), JSON.stringify({ commit }) + "\n");
