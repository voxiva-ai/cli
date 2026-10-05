/** Rough token estimate — good enough for /usage until providers return usage. */
export declare function estimateTokens(text: string): number;
export declare function estimateMessagesTokens(messages: {
    role: string;
    content: string;
}[]): number;
export type SessionUsage = {
    inputTokens: number;
    outputTokens: number;
    turns: number;
    /** Model used for the latest turn. */
    lastModel?: string;
    /** Plan for the latest turn. */
    lastPlan?: string;
};
export declare function emptyUsage(): SessionUsage;
export declare function formatUsage(usage: SessionUsage): string;
export type DayUsage = {
    date: string;
    inputTokens: number;
    outputTokens: number;
    turns: number;
    byModel: Record<string, {
        inputTokens: number;
        outputTokens: number;
        turns: number;
    }>;
};
export type UsageLedger = {
    version: 1;
    days: Record<string, DayUsage>;
};
export declare function loadLedger(): Promise<UsageLedger>;
/** Persist a completed turn into today's ledger (and keep last 60 days). */
export declare function recordTurnUsage(opts: {
    inputTokens: number;
    outputTokens: number;
    model?: string;
}): Promise<DayUsage>;
export declare function todayUsage(): Promise<DayUsage>;
export declare function dayTotal(day: DayUsage): number;
/** Pretty multi-line panel for the /usage overlay (scrollable). */
export declare function usagePanelLines(opts: {
    session: SessionUsage;
    today: DayUsage;
    model?: string;
    plan?: string;
    cwd?: string;
    contextTokens: number;
    free: boolean;
    locale?: string;
}): string[];
