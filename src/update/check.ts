import { readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { configDir, ensureDir } from "../config/store.js";
import { VERSION } from "../tui/copy.js";

export type UpdateInfo = {
  latest: string;
  current: string;
  url: string;
  /** Short hint for the banner */
  installHint: string;
  /** Full one-liner if /update isn't used */
  reinstallHint: string;
};

const CACHE_PATH = join(configDir(), "update-check.json");
const REPO = "voxiva-ai/cli";
const NPM = "@voxiva/cli";
/** Check more often so GitHub pushes show up quickly for users. */
const CACHE_MS = 60 * 60 * 1000;

type Cache = { checkedAt: number; latest?: string; url?: string };

function normalizeVersion(v: string): string {
  return v.trim().replace(/^v/i, "");
}

/** Semver-ish compare: 1 if a>b, -1 if a<b, 0 if equal/unknown. */
export function compareVersions(a: string, b: string): number {
  const pa = normalizeVersion(a).split(".").map((x) => Number.parseInt(x, 10) || 0);
  const pb = normalizeVersion(b).split(".").map((x) => Number.parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

export function reinstallHint(): string {
  return process.platform === "win32"
    ? "irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex"
    : "curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash";
}

async function readCache(): Promise<Cache | null> {
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf8")) as Cache;
  } catch {
    return null;
  }
}

async function writeCache(cache: Cache): Promise<void> {
  try {
    await ensureDir();
    await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n", "utf8");
  } catch {
    // Read-only profiles can still check for updates without caching.
  }
}

/** Clear cache so the next check hits the network. */
export async function clearUpdateCache(): Promise<void> {
  try {
    await unlink(CACHE_PATH);
  } catch {
    // ignore
  }
}

async function fetchJson(url: string, ms = 5000): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": `voxiva-cli/${VERSION}`,
      },
      signal: AbortSignal.timeout(ms),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchText(url: string, ms = 5000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": `voxiva-cli/${VERSION}` },
      signal: AbortSignal.timeout(ms),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function newestUpdate<T extends { latest: string }>(candidates: T[]): T | null {
  return candidates.reduce<T | null>(
    (newest, item) => (!newest || compareVersions(item.latest, newest.latest) > 0 ? item : newest),
    null,
  );
}

/** Resolve the newest published version across GitHub, main and npm in parallel. */
async function fetchLatest(): Promise<{ latest: string; url: string } | null> {
  const pkgUrls = [
    `https://raw.githubusercontent.com/${REPO}/main/package.json`,
    `https://cdn.jsdelivr.net/gh/${REPO}@main/package.json`,
  ];
  const [release, npm, ...packages] = await Promise.all([
    fetchJson(`https://api.github.com/repos/${REPO}/releases/latest`) as Promise<{
      tag_name?: string;
      html_url?: string;
    } | null>,
    fetchJson(`https://registry.npmjs.org/${NPM}/latest`) as Promise<{ version?: string } | null>,
    ...pkgUrls.map((url) => fetchText(url)),
  ]);
  const mainCandidates: { latest: string; url: string }[] = [];
  for (const text of packages) {
    if (!text) continue;
    try {
      const version = (JSON.parse(text) as { version?: string }).version;
      if (version) {
        mainCandidates.push({
          latest: normalizeVersion(version),
          url: `https://github.com/${REPO}`,
        });
      }
    } catch {
      // Ignore a broken mirror and use another source.
    }
  }
  // The updater installs GitHub main, so it is canonical; the others are fallbacks.
  return (
    newestUpdate(mainCandidates) ??
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
      : null)
  );
}

function toInfo(latest: string, current: string, url: string): UpdateInfo {
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
export async function checkForUpdate(force = false): Promise<UpdateInfo | null> {
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
  if (!remote) return null;
  if (compareVersions(remote.latest, current) <= 0) return null;
  return toInfo(remote.latest, current, remote.url);
}
