export type MemoryNote = {
    id: string;
    text: string;
    createdAt: string;
};
export declare function listMemory(): Promise<MemoryNote[]>;
export declare function addMemory(text: string): Promise<MemoryNote>;
export declare function removeMemory(id: string): Promise<boolean>;
export declare function clearMemory(): Promise<void>;
/** Compact block for system prompt. */
export declare function memoryPromptBlock(): Promise<string | null>;
