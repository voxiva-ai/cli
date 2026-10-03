/** Load project AGENTS.md if present (trimmed). */
export declare function loadAgentsMarkdown(cwd: string): Promise<string | null>;
export declare function withAgentsContext(system: string, agents: string | null): string;
