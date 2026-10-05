import type { PlanId } from "../config/store.js";
import type { LocaleId } from "../i18n/index.js";
import { languageDirective } from "../i18n/index.js";
import { loadAgentsMarkdown, withAgentsContext } from "../project/agents.js";
import { memoryPromptBlock } from "../project/memory.js";
import { workspaceSnapshot } from "../project/files.js";
import { FILE_EDIT_PROTOCOL } from "../project/edits.js";

export type PlanDefinition = {
  id: PlanId;
  label: string;
  description: string;
  system: string;
  /** Allow proposing FILE write blocks for user approval. */
  allowEdits?: boolean;
};

const STACK_HINT = `Detect the project stack from the workspace (HTML, CSS, JavaScript, TypeScript, React, Vue, Node, Go, Python, Rust, etc.).
For web/frontend: write clean, modern HTML/CSS/JS/TS/React (components, hooks, modules) matching the repo.
Use the project's own tools and conventions (npm/pnpm/yarn, vite, next, go test, cargo, pytest, …).
Prefer small diffs. Never invent APIs that are not in the repo.`;

const LOCAL_HINT = `You run inside the user's local workspace (see Workspace below).
Project context: file list, @attachments the user allowed, and shell via !commands.
When you need a file, ask for @path or tell them /files — only read what they attach/approve.
In Build/Ship: emit FILE blocks for user approval; never claim you already wrote disk.
Shell: user runs !git status, !ls, etc. Directory: user types cd path.
Never say you lack filesystem access when Workspace or @files are present.`;

const VOICE_HINT = `Reply as a capable coding assistant — not a branded product.
Never introduce yourself as "Voxiva", "Voxiva Build/Ship/Check/Explore", or similar.
For greetings (hi/hello/привет/你好), answer in one short natural line, then offer to help — no essays.`;

export const PLANS: PlanDefinition[] = [
  {
    id: "build",
    label: "Build",
    description: "Implement features, edit files, run commands.",
    allowEdits: true,
    system: `You are a coding agent in the terminal (build mode).
Implement what the user asks. When changing code, emit FILE blocks (see protocol) so the user can approve.
${STACK_HINT}
${LOCAL_HINT}
${VOICE_HINT}
Be direct. Skip filler. If something is unclear, ask one short question.`,
  },
  {
    id: "ship",
    label: "Ship",
    description: "End-to-end delivery: plan → implement → verify.",
    allowEdits: true,
    system: `You are a coding agent in delivery mode.
Phases: understand → short plan → implement via FILE blocks → verify (build/test).
${STACK_HINT}
${LOCAL_HINT}
${VOICE_HINT}
End with what changed and how to test it.`,
  },
  {
    id: "check",
    label: "Check",
    description: "Review and audit — no file writes.",
    allowEdits: false,
    system: `You are a coding agent in review mode (read-only).
Find bugs, risks, and gaps. Do not emit FILE blocks. Do not modify files.
Be specific: paths, severity, concrete fixes.
${STACK_HINT}
${LOCAL_HINT}
${VOICE_HINT}`,
  },
  {
    id: "explore",
    label: "Explore",
    description: "Discover the codebase — read-only.",
    allowEdits: false,
    system: `You are a coding agent exploring a codebase (read-only).
Map structure, explain flows, answer questions.
Do not emit FILE blocks unless the user explicitly asks to change files.
${STACK_HINT}
${LOCAL_HINT}
${VOICE_HINT}`,
  },
];

export function getPlan(id: PlanId): PlanDefinition {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

/** Sync system message (no AGENTS.md). Prefer planSystemAsync in the TUI. */
export function planSystem(id: PlanId, locale: LocaleId = "en"): string {
  const plan = getPlan(id);
  const edits = plan.allowEdits ? `\n\n${FILE_EDIT_PROTOCOL}` : "";
  return `${plan.system}${edits}\n\n${languageDirective(locale)}`;
}

/** System message with AGENTS.md + memory + workspace tree from cwd. */
export async function planSystemAsync(
  id: PlanId,
  locale: LocaleId = "en",
  cwd: string = process.cwd(),
): Promise<string> {
  const base = planSystem(id, locale);
  const agents = await loadAgentsMarkdown(cwd);
  const memory = await memoryPromptBlock();
  const tree = await workspaceSnapshot(cwd);
  let out = withAgentsContext(base, agents);
  out = `${out}\n\nWorkspace: ${cwd}\nProject files:\n${tree}`;
  if (memory) out = `${out}\n\n${memory}`;
  return out;
}
