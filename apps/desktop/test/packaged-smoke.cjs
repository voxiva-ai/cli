const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const pty = require("node-pty");
const asar = require("@electron/asar");
const { createShellConfig, writeCliLauncher } = require("../terminal-shell.cjs");
const release = path.join(__dirname, "../release");
const cliVersion = require("../../../package.json").version;

function resourceRoot() {
  if (process.platform === "win32") return path.join(release, "win-unpacked", "resources");
  if (process.platform === "linux") return path.join(release, "linux-unpacked", "resources");
  const appDir = fs.readdirSync(release, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("mac"))
    .map((entry) => path.join(release, entry.name, "Voxiva CLI.app", "Contents", "Resources"))
    .find((candidate) => fs.existsSync(candidate));
  if (!appDir) throw new Error("Packaged macOS application was not found.");
  return appDir;
}

const unpacked = path.join(resourceRoot(), "app.asar.unpacked", "node_modules");
const archive = path.join(resourceRoot(), "app.asar");
if (!fs.existsSync(archive)) throw new Error("Packaged Electron archive was not found.");
for (const [file, marker] of [["app-actions.cjs", "Unsupported theme."], ["update-service.cjs", "RELEASE_API"], ["preload.cjs", "checkUpdate"], ["cli-runtime.cjs", "app.asar.unpacked"], ["terminal-shell.cjs", "voxiva.cmd"], ["stream-buffer.js", "createStreamBuffer"]]) {
  const source = asar.extractFile(archive, file).toString("utf8");
  if (!source.includes(marker)) throw new Error(`Packaged desktop resource is incomplete: ${file}`);
}
const runtime = path.join(unpacked, "node", "bin", process.platform === "win32" ? "node.exe" : "node");
const cli = path.join(unpacked, "@voxiva", "cli", "dist", "index.js");
const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "voxiva-packaged-cli-shell-"));
try {
  writeCliLauncher({ binDir, nodePath: runtime, cliPath: cli });
  const config = createShellConfig({ binDir });
  const args = process.platform === "win32" ? [...config.args, "/d", "/c", "voxiva --version"] : ["-c", "voxiva --version"];
  const result = spawnSync(config.command, args, { cwd: path.resolve(__dirname, "../../.."), env: config.env, encoding: "utf8", windowsHide: true, timeout: 15000 });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  if (result.status !== 0 || !output.includes(cliVersion)) throw new Error(`Packaged shell could not run voxiva: ${output.trim()}`);
  console.log(`Packaged shell launched Voxiva CLI ${output.trim()}`);
} finally {
  fs.rmSync(binDir, { recursive: true, force: true });
}
const child = pty.spawn(runtime, [cli, "--version"], {
  cwd: path.resolve(__dirname, "../../.."),
  name: "xterm-256color",
  cols: 80,
  rows: 24,
  env: process.env,
});
let output = "";

child.onData((data) => { output += data; });
child.onExit(({ exitCode }) => {
  clearTimeout(timeout);
  if (exitCode !== 0 || !output.includes(cliVersion)) {
    console.error(`Packaged Voxiva CLI failed (exit ${exitCode}): ${output.trim()}`);
    process.exit(1);
  }
  console.log(`Packaged PTY launched Voxiva CLI ${output.trim()}`);
  process.exit(0);
});

const timeout = setTimeout(() => {
  child.kill();
  console.error("Packaged PTY smoke test timed out.");
  process.exit(1);
}, 15000);
