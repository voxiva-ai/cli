/** Rough token estimate — good enough for /cost until providers return usage. */
export declare function estimateTokens(text: string): number;
export declare function estimateMessagesTokens(messages: {
    role: string;
    content: string;
}[]): number;
export type SessionUsage = {
    inputTokens: number;
    outputTokens: number;
    turns: number;
};
export declare function emptyUsage(): SessionUsage;
export declare function formatUsage(usage: SessionUsage): string;
