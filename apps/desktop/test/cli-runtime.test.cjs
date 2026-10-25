const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const rootPackage = require("../../../package.json");
const { cliPaths } = require("../cli-runtime.cjs");

test("development desktop resolves CLI from the current repository build", () => {
  const paths = cliPaths({ isPackaged: false, appPath: "C:/repo/apps/desktop", resourcesPath: "C:/unused" });
  assert.equal(paths.root, path.resolve("C:/repo"));
  assert.equal(paths.entry, path.join(path.resolve("C:/repo"), "dist", "index.js"));
});

test("packaged desktop resolves CLI from bundled resources", () => {
  const paths = cliPaths({ isPackaged: true, appPath: "C:/repo/apps/desktop", resourcesPath: "C:/app/resources" });
  assert.equal(paths.root, path.join("C:/app/resources", "app.asar.unpacked", "node_modules", "@voxiva", "cli"));
  assert.equal(paths.entry, path.join(paths.root, "dist", "index.js"));
});

test("desktop development launch builds the current CLI before opening Electron", () => {
  assert.match(rootPackage.scripts.desktop, /^npm run build &&/);
});
