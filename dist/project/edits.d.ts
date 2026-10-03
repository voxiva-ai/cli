export type FileEdit = {
    path: string;
    action: "write" | "create";
    content: string;
    exists: boolean;
    preview: string;
};
/** Instruct models how to propose disk edits (applied only after user approval). */
export declare const FILE_EDIT_PROTOCOL = "When you need to create or change project files, output one or more blocks EXACTLY in this form (no fences around the markers):\n\n<<<FILE path=\"relative/path.ext\" action=\"write\">>>\nfull file contents here\n<<<END>>>\n\nRules:\n- path is relative to the workspace root\n- action is \"write\" (create or overwrite)\n- Put the COMPLETE file contents inside the block\n- You may include a short explanation outside the blocks\n- Do NOT modify files yourself \u2014 the user will approve each change\n- In check/explore plans, do not emit FILE blocks";
export declare function stripFileBlocks(text: string): string;
export declare function extractFileBlocks(text: string): {
    path: string;
    action: "write" | "create";
    content: string;
}[];
export declare function prepareEdits(cwd: string, blocks: {
    path: string;
    action: "write" | "create";
    content: string;
}[]): Promise<FileEdit[]>;
export declare function applyEdit(cwd: string, edit: FileEdit): Promise<void>;
export declare function applyEdits(cwd: string, edits: FileEdit[]): Promise<string[]>;
export declare function editSummary(edit: FileEdit): string;
