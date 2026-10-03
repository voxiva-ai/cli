import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
const BLOCK_RE = /<<<FILE\s+path="([^"]+)"\s+action="(write|create)"\s*>>>\r?\n([\s\S]*?)<<<END>>>/gi;
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
export function stripFileBlocks(text) {
    return text.replace(BLOCK_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}
export function extractFileBlocks(text) {
    const out = [];
    const re = new RegExp(BLOCK_RE.source, "gi");
    let match;
    while ((match = re.exec(text)) !== null) {
        const path = match[1].trim().replace(/\\/g, "/");
        const action = match[2].toLowerCase() === "create" ? "create" : "write";
        const content = match[3].replace(/^\r?\n/, "").replace(/\r?\n$/, "");
        if (!path || path.includes(".."))
            continue;
        out.push({ path, action, content });
    }
    return out;
}
export async function prepareEdits(cwd, blocks) {
    const edits = [];
    for (const block of blocks) {
        const abs = resolve(cwd, block.path);
        const root = resolve(cwd);
        if (!abs.startsWith(root))
            continue;
        let exists = false;
        try {
            await readFile(abs, "utf8");
            exists = true;
        }
        catch {
            exists = false;
        }
        const lines = block.content.split(/\r?\n/);
        const preview = lines.slice(0, 3).join(" ").slice(0, 80);
        edits.push({
            path: relative(cwd, abs).replace(/\\/g, "/") || block.path,
            action: exists ? "write" : "create",
            content: block.content,
            exists,
            preview,
        });
    }
    return edits;
}
export async function applyEdit(cwd, edit) {
    const abs = join(cwd, edit.path);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, edit.content, "utf8");
}
export async function applyEdits(cwd, edits) {
    const applied = [];
    for (const edit of edits) {
        await applyEdit(cwd, edit);
        applied.push(edit.path);
    }
    return applied;
}
export function editSummary(edit) {
    const lines = edit.content.split(/\r?\n/).length;
    const kind = edit.exists ? "update" : "create";
    return `${edit.path} · ${kind} · ${lines} lines`;
}
