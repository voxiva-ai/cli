import { type ModelRef, type PlanId } from "../config/store.js";
export type WorkspaceRecord = {
    path: string;
    title: string;
    updatedAt: string;
    lastSessionId?: string;
    lastModel?: ModelRef;
    lastPlan?: PlanId;
};
export declare function listWorkspaces(): Promise<WorkspaceRecord[]>;
export declare function touchWorkspace(cwd: string, patch?: Partial<Pick<WorkspaceRecord, "lastSessionId" | "lastModel" | "lastPlan">>): Promise<WorkspaceRecord>;
export declare function getWorkspace(cwd: string): Promise<WorkspaceRecord | undefined>;
