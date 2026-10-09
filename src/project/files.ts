import { readFile, readdir, stat } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve } from "node:path";

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
const READ_RE = /<<<READ\s+path="([^"]+)"\s*>>>/gi;

export const FILE_READ_PROTOCOL = `To inspect a project file, output one or more requests EXACTLY like this:
<<<READ path="relative/path.ext">>>
When requesting files, output only READ requests with no explanation. The CLI reads safe project files and calls you again automatically. Request only files you need, up to 6 at a time. Never ask the user to attach a listed project file.`;

export function extractReadPaths(text: string): string[] {
  const paths: string[] = [];
  const re = new RegExp(READ_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null && paths.length < 6) {
    const path = match[1].trim().replace(/\\/g, "/");
    if (path && !paths.includes(path)) paths.push(path);
  }
  return paths;
}

export function stripReadBlocks(text: string): string {
  return text.replace(READ_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

/** Read model-requested files without allowing secrets or paths outside the workspace. */
export async function readRequestedFiles(cwd: string, paths: string[]): Promise<string> {
  const root = resolve(cwd);
  const blocks: string[] = [];
  let total = 0;
  for (const requested of paths.slice(0, 6)) {
    const abs = resolve(root, requested);
    const rel = relative(root, abs);
    const name = basename(abs).toLowerCase();
    const denied =
      !rel ||
      rel.startsWith("..") ||
      isAbsolute(rel) ||
      rel.split(/[\\/]/).some((part) => IGNORE.has(part)) ||
      (name.startsWith(".env") && name !== ".env.example");
    if (denied) {
      blocks.push(`<file-error path="${requested}">Access denied.</file-error>`);
      continue;
    }
    try {
      const content = await readFile(abs, "utf8");
      if (content.includes("\0")) throw new Error("Binary file");
      const room = Math.max(0, 18_000 - total);
      const shown = content.slice(0, Math.min(9_000, room));
      total += shown.length;
      blocks.push(`<file path="${rel.replace(/\\/g, "/")}">\n${shown}\n</file>`);
      if (total >= 18_000) break;
    } catch {
      blocks.push(`<file-error path="${requested}">Unreadable or missing.</file-error>`);
    }
  }
  return `${blocks.join("\n\n")}\n\nContinue the original task. Request another file only if necessary.`;
}

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

/** Compact file list for the system prompt so the model knows the workspace. */
export async function workspaceSnapshot(cwd: string, limit = 40): Promise<string> {
  const files = await listProjectFiles(cwd);
  if (!files.length) return `(empty or unreadable: ${cwd})`;
  const shown = files.slice(0, limit);
  const more = files.length > limit ? `\n… +${files.length - limit} more` : "";
  return shown.join("\n") + more;
}
