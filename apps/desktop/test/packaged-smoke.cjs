const fs = require("node:fs");
const path = require("node:path");
const pty = require("node-pty");
const release = path.join(__dirname, "../release");

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
const runtime = path.join(unpacked, "node", "bin", process.platform === "win32" ? "node.exe" : "node");
const cli = path.join(unpacked, "@voxiva", "cli", "dist", "index.js");
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
  if (exitCode !== 0 || !output.includes("0.1.4")) {
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
