/** Rough token estimate — good enough for /cost until providers return usage. */
export function estimateTokens(text) {
    if (!text)
        return 0;
    return Math.max(1, Math.ceil(text.length / 4));
}
export function estimateMessagesTokens(messages) {
    return messages.reduce((sum, message) => sum + estimateTokens(message.content), 0);
}
export function emptyUsage() {
    return { inputTokens: 0, outputTokens: 0, turns: 0 };
}
export function formatUsage(usage) {
    const total = usage.inputTokens + usage.outputTokens;
    return `${total.toLocaleString()} tokens (~${usage.inputTokens.toLocaleString()} in / ${usage.outputTokens.toLocaleString()} out, ${usage.turns} turns)`;
}
