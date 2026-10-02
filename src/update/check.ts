import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { configDir, ensureDir } from "../config/store.js";
import { VERSION } from "../tui/copy.js";

export type UpdateInfo = {
  latest: string;
  current: string;
  url: string;
  installHint: string;
};

const CACHE_PATH = join(configDir(), "update-check.json");
const REPO = "voxiva-ai/cli";
const NPM = "@voxiva/cli";
const DAY_MS = 24 * 60 * 60 * 1000;

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

async function readCache(): Promise<Cache | null> {
  try {
    return JSON.parse(await readFile(CACHE_PATH, "utf8")) as Cache;
  } catch {
    return null;
  }
}

async function writeCache(cache: Cache): Promise<void> {
  await ensureDir();
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n", "utf8");
}

async function fetchLatest(): Promise<{ latest: string; url: string } | null> {
  try {
    const gh = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": `voxiva-cli/${VERSION}`,
      },
      signal: AbortSignal.timeout(4000),
    });
    if (gh.ok) {
      const data = (await gh.json()) as { tag_name?: string; html_url?: string };
      if (data.tag_name) {
        return {
          latest: normalizeVersion(data.tag_name),
          url: data.html_url ?? `https://github.com/${REPO}/releases`,
        };
      }
    }
  } catch {
    // fall through to npm
  }

  try {
    const npm = await fetch(`https://registry.npmjs.org/${NPM}/latest`, {
      headers: { accept: "application/json", "user-agent": `voxiva-cli/${VERSION}` },
      signal: AbortSignal.timeout(4000),
    });
    if (npm.ok) {
      const data = (await npm.json()) as { version?: string };
      if (data.version) {
        return {
          latest: normalizeVersion(data.version),
          url: `https://www.npmjs.com/package/${NPM}`,
        };
      }
    }
  } catch {
    // offline — ignore
  }
  return null;
}

/**
 * Non-blocking update check. Returns info only when a newer release exists.
 * Cached for 24h so startups stay fast and installs never break.
 */
export async function checkForUpdate(force = false): Promise<UpdateInfo | null> {
  const current = normalizeVersion(VERSION);
  const cache = await readCache();
  if (!force && cache && Date.now() - cache.checkedAt < DAY_MS && cache.latest) {
    if (compareVersions(cache.latest, current) > 0) {
      return {
        latest: cache.latest,
        current,
        url: cache.url ?? `https://github.com/${REPO}/releases`,
        installHint:
          process.platform === "win32"
            ? "irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex"
            : "curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash",
      };
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

  return {
    latest: remote.latest,
    current,
    url: remote.url,
    installHint:
      process.platform === "win32"
        ? "irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex"
        : "curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash",
  };
}
