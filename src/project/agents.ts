import { readFile } from "node:fs/promises";
import { join } from "node:path";

const MAX_CHARS = 24_000;

/** Load project AGENTS.md if present (trimmed). */
export async function loadAgentsMarkdown(cwd: string): Promise<string | null> {
  const path = join(cwd, "AGENTS.md");
  try {
    const raw = await readFile(path, "utf8");
    const text = raw.trim();
    if (!text) return null;
    return text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}\n\n…(truncated)` : text;
  } catch {
    return null;
  }
}

export function withAgentsContext(system: string, agents: string | null): string {
  if (!agents) return system;
  return `${system}\n\n# Project instructions (AGENTS.md)\n\n${agents}`;
}
