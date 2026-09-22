import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const IGNORE = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".turbo",
  ".cache",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
]);

const MAX_FILES = 250;

/** Flat list of project-relative file paths for the /files picker. */
export async function listProjectFiles(cwd: string, query = ""): Promise<string[]> {
  const found: string[] = [];
  const q = query.trim().toLowerCase();

  async function walk(dir: string): Promise<void> {
    if (found.length >= MAX_FILES) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (found.length >= MAX_FILES) return;
      if (entry.name.startsWith(".") && entry.name !== ".env.example") {
        if (IGNORE.has(entry.name)) continue;
        if (entry.isDirectory()) continue;
      }
      if (IGNORE.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const rel = relative(cwd, full).replace(/\\/g, "/");
      if (q && !rel.toLowerCase().includes(q)) continue;
      found.push(rel);
    }
  }

  await walk(cwd);
  found.sort((a, b) => a.localeCompare(b));
  return found;
}

export async function fileExists(cwd: string, rel: string): Promise<boolean> {
  try {
    const info = await stat(join(cwd, rel));
    return info.isFile();
  } catch {
    return false;
  }
}
