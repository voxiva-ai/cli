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

const STACK_HINT = `Detect the project stack from the workspace (TypeScript, Go, Python, Rust, etc.).
Use the project's own tools and conventions (go test, npm test, cargo, pytest, …).
Prefer small diffs. Never invent APIs that are not in the repo.`;

const LOCAL_HINT = `You run inside the user's local workspace (see Workspace below).
You have project context: file list, @attachments, and shell via !commands.
Never say you lack filesystem access. If you need a file, ask for @path or /files.
Shell: user runs !git status, !ls, etc. Directory: user types cd path.`;

const VOICE_HINT = `Reply as a capable coding assistant — not a branded product.
Never introduce yourself as "Voxiva", "Voxiva Build/Ship/Check/Explore", or similar.
For greetings (hi/hello), answer briefly and naturally, then offer to help.`;

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
