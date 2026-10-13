import { readFileSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { configDir, ensureDir, writeFileAtomic } from "../config/store.js";
import { VERSION } from "../tui/copy.js";
const CACHE_PATH = join(configDir(), "update-check.json");
const REPO = "voxiva-ai/cli";
const NPM = "@voxiva/cli";
/** Check more often so GitHub pushes show up quickly for users. */
const CACHE_MS = 10 * 60 * 1000;
let BUILD_COMMIT = "";
try {
    BUILD_COMMIT = JSON.parse(readFileSync(new URL("../build.json", import.meta.url), "utf8")).commit ?? "";
}
catch {
    // Older and source-less installations use version checks.
}
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
export function hasUpdate(current, latest, localRevision, remoteRevision) {
    return (compareVersions(latest, current) > 0 ||
        Boolean(remoteRevision && localRevision && remoteRevision !== localRevision));
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
    try {
        await ensureDir();
        await writeFileAtomic(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n");
    }
    catch {
        // Read-only profiles can still check for updates without caching.
    }
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
export function newestUpdate(candidates) {
    return candidates.reduce((newest, item) => (!newest || compareVersions(item.latest, newest.latest) > 0 ? item : newest), null);
}
/** Resolve the newest published version across GitHub, main and npm in parallel. */
async function fetchLatest() {
    const pkgUrls = [
        `https://raw.githubusercontent.com/${REPO}/main/package.json`,
        `https://cdn.jsdelivr.net/gh/${REPO}@main/package.json`,
    ];
    const [release, npm, commit, ...packages] = await Promise.all([
        fetchJson(`https://api.github.com/repos/${REPO}/releases/latest`),
        fetchJson(`https://registry.npmjs.org/${NPM}/latest`),
        fetchJson(`https://api.github.com/repos/${REPO}/commits/main`),
        ...pkgUrls.map((url) => fetchText(url)),
    ]);
    const mainCandidates = [];
    for (const text of packages) {
        if (!text)
            continue;
        try {
            const version = JSON.parse(text).version;
            if (version) {
                mainCandidates.push({
                    latest: normalizeVersion(version),
                    url: `https://github.com/${REPO}`,
                });
            }
        }
        catch {
            // Ignore a broken mirror and use another source.
        }
    }
    // The updater installs GitHub main, so it is canonical; the others are fallbacks.
    const versionInfo = newestUpdate(mainCandidates) ??
        (release?.tag_name
            ? {
                latest: normalizeVersion(release.tag_name),
                url: release.html_url ?? `https://github.com/${REPO}/releases`,
            }
            : null) ??
        (npm?.version
            ? {
                latest: normalizeVersion(npm.version),
                url: `https://www.npmjs.com/package/${NPM}`,
            }
            : null);
    return versionInfo ? { ...versionInfo, revision: commit?.sha } : null;
}
function toInfo(latest, current, url, revision) {
    return {
        latest,
        current,
        url,
        installHint: "voxiva update   or   /update",
        reinstallHint: reinstallHint(),
        revision,
    };
}
/**
 * Non-blocking update check. Returns info only when a newer release exists.
 */
export async function checkForUpdate(force = false) {
    const current = normalizeVersion(VERSION);
    const cache = await readCache();
    if (!force && cache && Date.now() - cache.checkedAt < CACHE_MS && cache.latest) {
        if (hasUpdate(current, cache.latest, BUILD_COMMIT, cache.revision)) {
            return toInfo(cache.latest, current, cache.url ?? `https://github.com/${REPO}`, cache.revision);
        }
        return null;
    }
    const remote = await fetchLatest();
    if (remote) {
        await writeCache({
            checkedAt: Date.now(),
            latest: remote.latest,
            url: remote.url,
            revision: remote.revision,
        });
    }
    if (!remote)
        return null;
    if (!hasUpdate(current, remote.latest, BUILD_COMMIT, remote.revision))
        return null;
    return toInfo(remote.latest, current, remote.url, remote.revision);
}
