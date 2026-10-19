const fs = require("node:fs/promises");
const path = require("node:path");
const { Transform, Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const RELEASE_API = "https://api.github.com/repos/voxiva-ai/cli/releases/latest";
const RELEASE_PAGE = "https://github.com/voxiva-ai/cli/releases/latest";
const MAX_ASSET_BYTES = 3 * 1024 * 1024 * 1024;
const CACHE_MS = 10 * 60 * 1000;

function version(value) {
  const match = typeof value === "string" && value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:[-+][\w.-]+)?$/i);
  return match ? { text: `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`, parts: match.slice(1, 4).map(Number) } : null;
}

function compare(left, right) {
  const a = version(left)?.parts;
  const b = version(right)?.parts;
  if (!a || !b) return 0;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}

function createUpdateService({ currentVersion, platform = process.platform, arch = process.arch, fetchRelease = defaultFetchRelease, fetchAsset = globalThis.fetch }) {
  const current = version(currentVersion)?.text ?? "0.0.0";
  let cached;
  let checkedAt = 0;
  return {
    async check() {
      if (cached && Date.now() - checkedAt < CACHE_MS) return cached;
      let raw;
      try { raw = await fetchRelease(); } catch {}
      const latest = version(raw?.tag_name)?.text;
      const page = safeReleasePage(raw?.html_url) ?? RELEASE_PAGE;
      const releaseReady = Boolean(latest && Array.isArray(raw?.assets) && raw.assets.some((item) => isDesktopAsset(item, latest)));
      const newer = Boolean(latest && releaseReady && compare(latest, current) > 0);
      const asset = newer ? selectAsset(raw.assets, latest, platform, arch) : null;
      cached = { current, latest: latest ?? null, releaseReady, available: newer, asset, releaseUrl: page, supportedAction: newer ? (asset ? "download" : "release-page") : "none" };
      checkedAt = Date.now();
      return cached;
    },
    async download({ directory, onProgress = () => {}, signal } = {}) {
      const status = await this.check();
      if (!status.available || !status.asset) throw new Error("No compatible desktop update is available.");
      if (typeof directory !== "string" || !directory) throw new Error("Choose a download folder.");
      const response = await fetchAsset(status.asset.url, { signal, headers: { "user-agent": `voxiva-desktop/${current}` } });
      if (!response?.ok || !response.body) throw new Error("GitHub could not provide this update. Open the release page and try again.");
      const total = Number(response.headers.get("content-length")) || status.asset.size;
      if (total > MAX_ASSET_BYTES) throw new Error("The update asset is larger than the supported download limit.");
      await fs.mkdir(directory, { recursive: true });
      const destination = path.join(directory, status.asset.name);
      let received = 0;
      let reservedPath;
      try {
        let outputPath = destination;
        for (let suffix = 2; ; suffix++) {
          try {
            const handle = await fs.open(outputPath, "wx");
            await handle.close();
            reservedPath = outputPath;
            break;
          } catch (error) {
            if (error.code !== "EEXIST" || suffix > 99) throw error;
            const parsed = path.parse(destination);
            outputPath = path.join(parsed.dir, `${parsed.name} (${suffix})${parsed.ext}`);
          }
        }
        const targetPath = outputPath;
        const counter = new Transform({ transform(chunk, _encoding, callback) {
          received += chunk.length;
          if (received > MAX_ASSET_BYTES) return callback(new Error("The update asset is larger than the supported download limit."));
          onProgress({ received, total, percent: total ? Math.min(100, Math.floor(received / total * 100)) : null });
          callback(null, chunk);
        } });
        await pipeline(Readable.fromWeb(response.body), counter, require("node:fs").createWriteStream(targetPath), { signal });
        if (status.asset.size && received !== status.asset.size) throw new Error("The downloaded update size did not match GitHub metadata.");
        if (platform === "linux") await fs.chmod(targetPath, 0o755);
        return { path: targetPath, releaseUrl: status.releaseUrl };
      } catch (error) {
        if (reservedPath) await fs.unlink(reservedPath).catch(() => {});
        throw error;
      }
    },
  };
}

async function defaultFetchRelease() {
  const response = await fetch(RELEASE_API, { headers: { accept: "application/vnd.github+json", "user-agent": "voxiva-desktop" }, signal: AbortSignal.timeout(7000) });
  if (!response.ok) return null;
  return response.json();
}

function safeReleasePage(value) {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "github.com" && url.pathname.startsWith("/voxiva-ai/cli/releases/") ? url.href : null; }
  catch { return null; }
}

function selectAsset(assets, latest, platform, arch) {
  const target = platform === "win32" ? "win" : platform === "darwin" ? "mac" : platform === "linux" ? "linux" : null;
  if (!target || !["x64", "arm64"].includes(arch) || !Array.isArray(assets)) return null;
  const extension = target === "win" ? /\.exe$/i : target === "mac" ? /\.dmg$/i : /\.appimage$/i;
  for (const item of assets) {
    if (typeof item?.name !== "string" || path.basename(item.name) !== item.name || item.name.length > 220 || !item.name.startsWith(`Voxiva CLI-${latest}-${target}-${arch}`) || !extension.test(item.name)) continue;
    const url = safeAssetUrl(item.browser_download_url);
    if (!url || !Number.isSafeInteger(item.size) || item.size <= 0 || item.size > MAX_ASSET_BYTES) continue;
    return { name: item.name, size: item.size, url };
  }
  return null;
}

function isDesktopAsset(item, latest) {
  return typeof item?.name === "string" && /^Voxiva CLI-/.test(item.name) && new RegExp(`^Voxiva CLI-${latest}-(win-(x64|arm64)\\.exe|mac-(x64|arm64)\\.dmg|linux-(x64|arm64)\\.AppImage)$`, "i").test(item.name);
}

function safeAssetUrl(value) {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "github.com" && url.pathname.startsWith("/voxiva-ai/cli/releases/download/") ? url.href : null; }
  catch { return null; }
}

module.exports = { createUpdateService };
