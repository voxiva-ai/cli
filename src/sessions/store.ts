import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { configDir, ensureDir, type ModelRef, type PlanId } from "../config/store.js";
import type { ChatMessage } from "../providers/chat.js";

export type SessionRecord = {
  id: string;
  title: string;
  updatedAt: string;
  plan: PlanId;
  model?: ModelRef;
  messages: ChatMessage[];
};

const PATH = join(configDir(), "sessions.json");

async function readAll(): Promise<SessionRecord[]> {
  try {
    return JSON.parse(await readFile(PATH, "utf8")) as SessionRecord[];
  } catch {
    return [];
  }
}

async function writeAll(sessions: SessionRecord[]): Promise<void> {
  await ensureDir();
  await writeFile(PATH, JSON.stringify(sessions.slice(0, 50), null, 2) + "\n", "utf8");
}

export async function listSessions(): Promise<SessionRecord[]> {
  return (await readAll()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function saveSession(
  session: Omit<SessionRecord, "id" | "updatedAt"> & { id?: string },
): Promise<string> {
  const sessions = await readAll();
  const id = session.id ?? randomUUID();
  const record: SessionRecord = {
    ...session,
    id,
    updatedAt: new Date().toISOString(),
  };
  const index = sessions.findIndex((item) => item.id === id);
  if (index >= 0) sessions[index] = record;
  else sessions.unshift(record);
  await writeAll(sessions);
  return id;
}

export async function getSession(id: string): Promise<SessionRecord | undefined> {
  return (await readAll()).find((session) => session.id === id);
}
