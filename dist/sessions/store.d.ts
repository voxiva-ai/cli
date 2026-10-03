import { type ModelRef, type PlanId } from "../config/store.js";
import type { ChatMessage } from "../providers/chat.js";
export type SessionRecord = {
    id: string;
    title: string;
    updatedAt: string;
    plan: PlanId;
    model?: ModelRef;
    /** Workspace folder where the session ran. */
    cwd?: string;
    messages: ChatMessage[];
};
export declare function listSessions(): Promise<SessionRecord[]>;
export declare function listSessionsForCwd(cwd: string): Promise<SessionRecord[]>;
export declare function saveSession(session: Omit<SessionRecord, "id" | "updatedAt"> & {
    id?: string;
}): Promise<string>;
export declare function getSession(id: string): Promise<SessionRecord | undefined>;
/** Prefer last session in this workspace; fall back to global latest. */
export declare function getContinuableSession(cwd?: string): Promise<SessionRecord | undefined>;
