const fs = require("node:fs");
const path = require("node:path");
const asar = require("@electron/asar");

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

const resources = resourceRoot();
const archive = path.join(resources, "app.asar");
if (!fs.existsSync(archive)) throw new Error("Packaged Electron archive was not found.");
for (const [file, marker] of [["app-actions.cjs", "Unsupported theme."], ["update-service.cjs", "RELEASE_API"], ["preload.cjs", "checkUpdate"], ["cli-runtime.cjs", "app.asar.unpacked"], ["stream-buffer.js", "createStreamBuffer"], ["index.html", "composer-form"]]) {
  const source = asar.extractFile(archive, file).toString("utf8");
  if (!source.includes(marker)) throw new Error(`Packaged desktop resource is incomplete: ${file}`);
  if (/terminal|xterm/i.test(source)) throw new Error(`Packaged desktop unexpectedly includes a terminal: ${file}`);
}
const cli = path.join(resources, "app.asar.unpacked", "node_modules", "@voxiva", "cli", "dist", "index.js");
if (!fs.existsSync(cli)) throw new Error("Packaged Voxiva chat engine is missing.");
console.log("Packaged Voxiva desktop UI and chat engine are present.");
