import { readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { configDir, ensureDir } from "../config/store.js";
import { VERSION } from "../tui/copy.js";
const CACHE_PATH = join(configDir(), "update-check.json");
const REPO = "voxiva-ai/cli";
const NPM = "@voxiva/cli";
/** Check more often so GitHub pushes show up quickly for users. */
const CACHE_MS = 6 * 60 * 60 * 1000;
function normalizeVersion(v) {
    return v.trim().replace(/^v/i, "");
}
/** Semver-ish compare: 1 if a>b, -1 if a<b, 0 if equal/unknown. */
export function compareVersions(a, b) {
    const pa = normalizeVersion(a).split(".").map((x) => Number.parseInt(x, 10) || 0);
    const pb = normalizeVersion(b).split(".").map((x) => Number.parseInt(x, 10) || 0);
    const n = Math.max(pa.length, pb.length);
    for (let i = 0; i < n; i++) {
        const x = pa[i] ?? 0;
        const y = pb[i] ?? 0;
        if (x > y)
            return 1;
        if (x < y)
            return -1;
    }
    return 0;
}
export function reinstallHint() {
    return process.platform === "win32"
        ? "irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex"
        : "curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash";
}
async function readCache() {
    try {
        return JSON.parse(await readFile(CACHE_PATH, "utf8"));
    }
    catch {
        return null;
    }
}
async function writeCache(cache) {
    await ensureDir();
    await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n", "utf8");
}
/** Clear cache so the next check hits the network. */
export async function clearUpdateCache() {
    try {
        await unlink(CACHE_PATH);
    }
    catch {
        // ignore
    }
}
async function fetchJson(url, ms = 5000) {
    try {
        const res = await fetch(url, {
            headers: {
                accept: "application/json",
                "user-agent": `voxiva-cli/${VERSION}`,
            },
            signal: AbortSignal.timeout(ms),
        });
        if (!res.ok)
            return null;
        return await res.json();
    }
    catch {
        return null;
    }
}
async function fetchText(url, ms = 5000) {
    try {
        const res = await fetch(url, {
            headers: { "user-agent": `voxiva-cli/${VERSION}` },
            signal: AbortSignal.timeout(ms),
        });
        if (!res.ok)
            return null;
        return await res.text();
    }
    catch {
        return null;
    }
}
/**
 * Resolve latest published version from (in order):
 * 1) GitHub Releases
 * 2) package.json on main (raw + jsDelivr) — works even without a Release
 * 3) npm registry (when published)
 */
async function fetchLatest() {
    const release = (await fetchJson(`https://api.github.com/repos/${REPO}/releases/latest`));
    if (release?.tag_name) {
        return {
            latest: normalizeVersion(release.tag_name),
            url: release.html_url ?? `https://github.com/${REPO}/releases`,
        };
    }
    const pkgUrls = [
        `https://raw.githubusercontent.com/${REPO}/main/package.json`,
        `https://cdn.jsdelivr.net/gh/${REPO}@main/package.json`,
    ];
    for (const url of pkgUrls) {
        const text = await fetchText(url);
        if (!text)
            continue;
        try {
            const pkg = JSON.parse(text);
            if (pkg.version) {
                return {
                    latest: normalizeVersion(pkg.version),
                    url: `https://github.com/${REPO}`,
                };
            }
        }
        catch {
            // next
        }
    }
    const npm = (await fetchJson(`https://registry.npmjs.org/${NPM}/latest`));
    if (npm?.version) {
        return {
            latest: normalizeVersion(npm.version),
            url: `https://www.npmjs.com/package/${NPM}`,
        };
    }
    return null;
}
function toInfo(latest, current, url) {
    return {
        latest,
        current,
        url,
        installHint: "voxiva update   or   /update",
        reinstallHint: reinstallHint(),
    };
}
/**
 * Non-blocking update check. Returns info only when a newer release exists.
 */
export async function checkForUpdate(force = false) {
    const current = normalizeVersion(VERSION);
    const cache = await readCache();
    if (!force && cache && Date.now() - cache.checkedAt < CACHE_MS && cache.latest) {
        if (compareVersions(cache.latest, current) > 0) {
            return toInfo(cache.latest, current, cache.url ?? `https://github.com/${REPO}`);
        }
        return null;
    }
    const remote = await fetchLatest();
    await writeCache({
        checkedAt: Date.now(),
        latest: remote?.latest ?? current,
        url: remote?.url,
    });
    if (!remote)
        return null;
    if (compareVersions(remote.latest, current) <= 0)
        return null;
    return toInfo(remote.latest, current, remote.url);
}
