import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative } from "node:path";
import { resolveProjectPath } from "./files.js";

export type FileEdit = {
  path: string;
  action: "write" | "create";
  content: string;
  exists: boolean;
  preview: string;
};

const BLOCK_RE =
  /<<<FILE\s+path="([^"]+)"\s+action="(write|create)"\s*>>>\r?\n([\s\S]*?)<<<END>>>/gi;

/** Instruct models how to propose disk edits (applied only after user approval). */
export const FILE_EDIT_PROTOCOL = `When you need to create or change project files, output one or more blocks EXACTLY in this form (no fences around the markers):

<<<FILE path="relative/path.ext" action="write">>>
full file contents here
<<<END>>>

Rules:
- path is relative to the workspace root
- action is "write" (create or overwrite)
- Put the COMPLETE file contents inside the block
- You may include a short explanation outside the blocks
- Do NOT modify files yourself — the user will approve each change
- In check/explore plans, do not emit FILE blocks`;

export function stripFileBlocks(text: string): string {
  return text.replace(BLOCK_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function extractFileBlocks(text: string): { path: string; action: "write" | "create"; content: string }[] {
  const out: { path: string; action: "write" | "create"; content: string }[] = [];
  const re = new RegExp(BLOCK_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const path = match[1].trim().replace(/\\/g, "/");
    const action = match[2].toLowerCase() === "create" ? "create" : "write";
    const content = match[3].replace(/^\r?\n/, "").replace(/\r?\n$/, "");
    if (!path || isAbsolute(path) || path.split("/").includes("..")) continue;
    out.push({ path, action, content });
  }
  return out;
}

export async function prepareEdits(
  cwd: string,
  blocks: { path: string; action: "write" | "create"; content: string }[],
): Promise<FileEdit[]> {
  const edits: FileEdit[] = [];
  const root = await realpath(cwd);
  for (const block of blocks) {
    const abs = await resolveProjectPath(root, block.path);
    if (!abs) continue;
    let exists = false;
    try {
      await readFile(abs, "utf8");
      exists = true;
    } catch {
      exists = false;
    }
    const lines = block.content.split(/\r?\n/);
    const preview = lines.slice(0, 3).join(" ").slice(0, 80);
    edits.push({
      path: relative(root, abs).replace(/\\/g, "/") || block.path,
      action: exists ? "write" : "create",
      content: block.content,
      exists,
      preview,
    });
  }
  return edits;
}

export async function applyEdit(cwd: string, edit: FileEdit): Promise<void> {
  const root = await realpath(cwd);
  const abs = await resolveProjectPath(root, edit.path);
  if (!abs) throw new Error(`Refusing to write outside the workspace: ${edit.path}`);
  await mkdir(dirname(abs), { recursive: true });
  const safePath = await resolveProjectPath(root, edit.path);
  if (!safePath) throw new Error(`Refusing to write outside the workspace: ${edit.path}`);
  await writeFile(safePath, edit.content, "utf8");
}

export async function applyEdits(cwd: string, edits: FileEdit[]): Promise<string[]> {
  const applied: string[] = [];
  for (const edit of edits) {
    await applyEdit(cwd, edit);
    applied.push(edit.path);
  }
  return applied;
}

export function editSummary(edit: FileEdit): string {
  const lines = edit.content.split(/\r?\n/).length;
  const kind = edit.exists ? "update" : "create";
  return `${edit.path} · ${kind} · ${lines} lines`;
}
