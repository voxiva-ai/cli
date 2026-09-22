import { access } from "node:fs/promises";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { configDir, ensureDir, type ModelRef, type PlanId } from "../config/store.js";

export type WorkspaceRecord = {
  path: string;
  title: string;
  updatedAt: string;
  lastSessionId?: string;
  lastModel?: ModelRef;
  lastPlan?: PlanId;
};

const PATH = join(configDir(), "workspaces.json");
const MAX = 30;

function normalize(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/, "") || path;
}

function titleFromPath(path: string): string {
  const parts = normalize(path).split("/").filter(Boolean);
  return parts[parts.length - 1] || path;
}

async function readAll(): Promise<WorkspaceRecord[]> {
  try {
    return JSON.parse(await readFile(PATH, "utf8")) as WorkspaceRecord[];
  } catch {
    return [];
  }
}

async function writeAll(items: WorkspaceRecord[]): Promise<void> {
  await ensureDir();
  await writeFile(PATH, JSON.stringify(items.slice(0, MAX), null, 2) + "\n", "utf8");
}

export async function listWorkspaces(): Promise<WorkspaceRecord[]> {
  const all = await readAll();
  const existing: WorkspaceRecord[] = [];
  for (const item of all) {
    try {
      await access(item.path);
      existing.push(item);
    } catch {
      // drop missing folders
    }
  }
  if (existing.length !== all.length) await writeAll(existing);
  return existing.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function touchWorkspace(
  cwd: string,
  patch: Partial<Pick<WorkspaceRecord, "lastSessionId" | "lastModel" | "lastPlan">> = {},
): Promise<WorkspaceRecord> {
  const path = normalize(cwd);
  const items = await readAll();
  const index = items.findIndex((item) => normalize(item.path) === path);
  const base: WorkspaceRecord =
    index >= 0
      ? items[index]
      : {
          path,
          title: titleFromPath(path),
          updatedAt: new Date().toISOString(),
        };
  const next: WorkspaceRecord = {
    ...base,
    ...patch,
    path,
    title: titleFromPath(path),
    updatedAt: new Date().toISOString(),
  };
  if (index >= 0) items.splice(index, 1);
  items.unshift(next);
  await writeAll(items);
  return next;
}

export async function getWorkspace(cwd: string): Promise<WorkspaceRecord | undefined> {
  const path = normalize(cwd);
  return (await listWorkspaces()).find((item) => normalize(item.path) === path);
}
