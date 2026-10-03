export type RunOptions = {
    model?: string;
    plan?: string;
    quiet?: boolean;
};
export declare function runPrompt(prompt: string, opts?: RunOptions): Promise<void>;
