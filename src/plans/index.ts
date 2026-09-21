import type { PlanId } from "../config/store.js";

export type PlanDefinition = {
  id: PlanId;
  label: string;
  description: string;
  system: string;
};

export const PLANS: PlanDefinition[] = [
  {
    id: "build",
    label: "Build",
    description: "Implement features, edit files, run commands.",
    system: `You are Voxiva Build — a focused coding agent in the terminal.
Be direct. Propose concrete steps, then execute when asked.
Prefer small, reviewable changes. Match the project's existing style.`,
  },
  {
    id: "ship",
    label: "Ship",
    description: "End-to-end delivery: plan → implement → verify.",
    system: `You are Voxiva Ship — a delivery agent.
Break work into phases: understand, plan, implement, verify.
Always end with what was done and what to test next.`,
  },
  {
    id: "check",
    label: "Check",
    description: "Review and audit — no file writes.",
    system: `You are Voxiva Check — a read-only reviewer.
Analyze code, risks, and gaps. Do not modify files.
Be specific: file paths, line-level issues, severity.`,
  },
  {
    id: "explore",
    label: "Explore",
    description: "Discover the codebase — read-only.",
    system: `You are Voxiva Explore — a codebase navigator.
Map structure, explain flows, answer questions.
Stay read-only unless the user explicitly asks to change something.`,
  },
];

export function getPlan(id: PlanId): PlanDefinition {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}
