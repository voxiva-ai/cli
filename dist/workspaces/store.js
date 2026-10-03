import { access } from "node:fs/promises";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { configDir, ensureDir } from "../config/store.js";
const PATH = join(configDir(), "workspaces.json");
const MAX = 30;
function normalize(path) {
    return path.replace(/\\/g, "/").replace(/\/+$/, "") || path;
}
function titleFromPath(path) {
    const parts = normalize(path).split("/").filter(Boolean);
    return parts[parts.length - 1] || path;
}
async function readAll() {
    try {
        return JSON.parse(await readFile(PATH, "utf8"));
    }
    catch {
        return [];
    }
}
async function writeAll(items) {
    await ensureDir();
    await writeFile(PATH, JSON.stringify(items.slice(0, MAX), null, 2) + "\n", "utf8");
}
export async function listWorkspaces() {
    const all = await readAll();
    const existing = [];
    for (const item of all) {
        try {
            await access(item.path);
            existing.push(item);
        }
        catch {
            // drop missing folders
        }
    }
    if (existing.length !== all.length)
        await writeAll(existing);
    return existing.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function touchWorkspace(cwd, patch = {}) {
    const path = normalize(cwd);
    const items = await readAll();
    const index = items.findIndex((item) => normalize(item.path) === path);
    const base = index >= 0
        ? items[index]
        : {
            path,
            title: titleFromPath(path),
            updatedAt: new Date().toISOString(),
        };
    const next = {
        ...base,
        ...patch,
        path,
        title: titleFromPath(path),
        updatedAt: new Date().toISOString(),
    };
    if (index >= 0)
        items.splice(index, 1);
    items.unshift(next);
    await writeAll(items);
    return next;
}
export async function getWorkspace(cwd) {
    const path = normalize(cwd);
    return (await listWorkspaces()).find((item) => normalize(item.path) === path);
}
