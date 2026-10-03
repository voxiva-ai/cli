/** Flat list of project-relative file paths for the /files picker. */
export declare function listProjectFiles(cwd: string, query?: string): Promise<string[]>;
export declare function fileExists(cwd: string, rel: string): Promise<boolean>;
/** Compact file list for the system prompt so the model knows the workspace. */
export declare function workspaceSnapshot(cwd: string, limit?: number): Promise<string>;
