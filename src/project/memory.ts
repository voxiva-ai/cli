import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { configDir, ensureDir } from "../config/store.js";

export type MemoryNote = {
  id: string;
  text: string;
  createdAt: string;
};

const PATH = join(configDir(), "memory.json");
const MAX_NOTES = 40;

async function readAll(): Promise<MemoryNote[]> {
  try {
    return JSON.parse(await readFile(PATH, "utf8")) as MemoryNote[];
  } catch {
    return [];
  }
}

async function writeAll(notes: MemoryNote[]): Promise<void> {
  await ensureDir();
  await writeFile(PATH, JSON.stringify(notes.slice(0, MAX_NOTES), null, 2) + "\n", "utf8");
}

export async function listMemory(): Promise<MemoryNote[]> {
  return (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addMemory(text: string): Promise<MemoryNote> {
  const notes = await readAll();
  const note: MemoryNote = {
    id: `${Date.now()}`,
    text: text.trim().slice(0, 2000),
    createdAt: new Date().toISOString(),
  };
  notes.unshift(note);
  await writeAll(notes);
  return note;
}

export async function removeMemory(id: string): Promise<boolean> {
  const notes = await readAll();
  const next = notes.filter((note) => note.id !== id);
  if (next.length === notes.length) return false;
  await writeAll(next);
  return true;
}

export async function clearMemory(): Promise<void> {
  await writeAll([]);
}

/** Compact block for system prompt. */
export async function memoryPromptBlock(): Promise<string | null> {
  const notes = await listMemory();
  if (!notes.length) return null;
  const lines = notes
    .slice(0, 20)
    .map((note, index) => `${index + 1}. ${note.text}`)
    .join("\n");
  return `# User memory\n\n${lines}`;
}
