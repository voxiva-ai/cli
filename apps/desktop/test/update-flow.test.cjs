const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createUpdateService } = require("../update-service.cjs");

const release = (tag_name = "v0.1.5", assets = []) => ({ tag_name, html_url: "https://github.com/voxiva-ai/cli/releases/tag/v0.1.5", assets });
const asset = (name, size = 123) => ({ name, size, browser_download_url: `https://github.com/voxiva-ai/cli/releases/download/v0.1.5/${encodeURIComponent(name)}` });

test("update check selects only the matching platform installer", async () => {
  const service = createUpdateService({ currentVersion: "0.1.4", platform: "win32", arch: "x64", fetchRelease: async () => release("v0.1.5", [asset("Voxiva CLI-0.1.5-win-x64.exe"), asset("Voxiva CLI-0.1.5-mac-arm64.dmg")]) });
  assert.deepEqual(await service.check(), {
    current: "0.1.4", latest: "0.1.5", releaseReady: true, available: true,
    asset: { name: "Voxiva CLI-0.1.5-win-x64.exe", size: 123, url: "https://github.com/voxiva-ai/cli/releases/download/v0.1.5/Voxiva%20CLI-0.1.5-win-x64.exe" },
    releaseUrl: "https://github.com/voxiva-ai/cli/releases/tag/v0.1.5", supportedAction: "download",
  });
});

test("bad metadata and network errors leave a safe unavailable result", async () => {
  for (const fetchRelease of [async () => null, async () => { throw new Error("offline"); }, async () => ({ ...release("latest"), assets: [asset("Voxiva CLI-0.1.5-win-arm64.exe")] })]) {
    const service = createUpdateService({ currentVersion: "0.1.4", platform: "win32", arch: "x64", fetchRelease });
    const status = await service.check();
    assert.equal(status.available, false);
    assert.equal(status.asset, null);
  }
});

test("a CLI-only release does not look like a desktop update", async () => {
  const service = createUpdateService({ currentVersion: "0.1.4", platform: "win32", arch: "x64", fetchRelease: async () => release("v0.1.5", [asset("voxiva-cli-0.1.5.tgz")]) });
  const status = await service.check();
  assert.equal(status.available, false);
  assert.equal(status.releaseReady, false);
});

test("unsupported architectures get a release-page fallback", async () => {
  const service = createUpdateService({ currentVersion: "0.1.4", platform: "linux", arch: "arm64", fetchRelease: async () => release("v0.1.5", [asset("Voxiva CLI-0.1.5-linux-x64.AppImage")]) });
  const status = await service.check();
  assert.equal(status.available, true);
  assert.equal(status.supportedAction, "release-page");
});

test("macOS updates select the DMG for manual installation", async () => {
  const service = createUpdateService({ currentVersion: "0.1.4", platform: "darwin", arch: "arm64", fetchRelease: async () => release("v0.1.5", [asset("Voxiva CLI-0.1.5-mac-arm64.dmg"), asset("Voxiva CLI-0.1.5-win-x64.exe")]) });
  const status = await service.check();
  assert.equal(status.asset.name, "Voxiva CLI-0.1.5-mac-arm64.dmg");
  assert.equal(status.supportedAction, "download");
});

test("confirmed update download reports progress and preserves existing files", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "voxiva-update-"));
  const target = path.join(dir, "Voxiva CLI-0.1.5-win-x64.exe");
  await fs.writeFile(target, "previous download");
  const service = createUpdateService({ currentVersion: "0.1.4", platform: "win32", arch: "x64", fetchRelease: async () => release("v0.1.5", [asset("Voxiva CLI-0.1.5-win-x64.exe", 9)]), fetchAsset: async () => new Response("installer") });
  try {
    const progress = [];
    const downloaded = await service.download({ directory: dir, onProgress: (item) => progress.push(item.percent) });
    assert.equal(await fs.readFile(downloaded.path, "utf8"), "installer");
    assert.match(downloaded.path, /\(2\)\.exe$/);
    assert.equal(await fs.readFile(target, "utf8"), "previous download");
    assert.ok(progress.includes(100));
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("Linux AppImage downloads are made executable", { skip: process.platform !== "linux" }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "voxiva-appimage-"));
  const service = createUpdateService({ currentVersion: "0.1.4", platform: "linux", arch: "x64", fetchRelease: async () => release("v0.1.5", [asset("Voxiva CLI-0.1.5-linux-x64.AppImage", 8)]), fetchAsset: async () => new Response("appimage") });
  try {
    const result = await service.download({ directory: dir });
    assert.ok((await fs.stat(result.path)).mode & 0o111);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("cancelled downloads remove their partial installer", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "voxiva-cancel-update-"));
  const service = createUpdateService({ currentVersion: "0.1.4", platform: "win32", arch: "x64", fetchRelease: async () => release("v0.1.5", [asset("Voxiva CLI-0.1.5-win-x64.exe", 9)]), fetchAsset: async () => new Response("installer") });
  const controller = new AbortController();
  controller.abort();
  try {
    await assert.rejects(service.download({ directory: dir, signal: controller.signal }), { name: "AbortError" });
    assert.deepEqual(await fs.readdir(dir), []);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
