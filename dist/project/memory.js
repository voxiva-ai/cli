import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { configDir, ensureDir } from "../config/store.js";
const PATH = join(configDir(), "memory.json");
const MAX_NOTES = 40;
async function readAll() {
    try {
        return JSON.parse(await readFile(PATH, "utf8"));
    }
    catch {
        return [];
    }
}
async function writeAll(notes) {
    await ensureDir();
    await writeFile(PATH, JSON.stringify(notes.slice(0, MAX_NOTES), null, 2) + "\n", "utf8");
}
export async function listMemory() {
    return (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function addMemory(text) {
    const notes = await readAll();
    const note = {
        id: `${Date.now()}`,
        text: text.trim().slice(0, 2000),
        createdAt: new Date().toISOString(),
    };
    notes.unshift(note);
    await writeAll(notes);
    return note;
}
export async function removeMemory(id) {
    const notes = await readAll();
    const next = notes.filter((note) => note.id !== id);
    if (next.length === notes.length)
        return false;
    await writeAll(next);
    return true;
}
export async function clearMemory() {
    await writeAll([]);
}
/** Compact block for system prompt. */
export async function memoryPromptBlock() {
    const notes = await listMemory();
    if (!notes.length)
        return null;
    const lines = notes
        .slice(0, 20)
        .map((note, index) => `${index + 1}. ${note.text}`)
        .join("\n");
    return `# User memory\n\n${lines}`;
}
