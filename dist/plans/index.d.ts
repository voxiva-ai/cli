import type { PlanId } from "../config/store.js";
import type { LocaleId } from "../i18n/index.js";
export type PlanDefinition = {
    id: PlanId;
    label: string;
    description: string;
    system: string;
    /** Allow proposing FILE write blocks for user approval. */
    allowEdits?: boolean;
};
export declare const PLANS: PlanDefinition[];
export declare function getPlan(id: PlanId): PlanDefinition;
/** Sync system message (no AGENTS.md). Prefer planSystemAsync in the TUI. */
export declare function planSystem(id: PlanId, locale?: LocaleId): string;
/** System message with AGENTS.md + memory + workspace tree from cwd. */
export declare function planSystemAsync(id: PlanId, locale?: LocaleId, cwd?: string): Promise<string>;
