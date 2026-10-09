export declare const FILE_READ_PROTOCOL = "To inspect a project file, output one or more requests EXACTLY like this:\n<<<READ path=\"relative/path.ext\">>>\nWhen requesting files, output only READ requests with no explanation. The CLI reads safe project files and calls you again automatically. Request only files you need, up to 6 at a time. Never ask the user to attach a listed project file.";
export declare function extractReadPaths(text: string): string[];
export declare function stripReadBlocks(text: string): string;
/** Read model-requested files without allowing secrets or paths outside the workspace. */
export declare function readRequestedFiles(cwd: string, paths: string[]): Promise<string>;
/** Flat list of project-relative file paths for the /files picker. */
export declare function listProjectFiles(cwd: string, query?: string): Promise<string[]>;
export declare function fileExists(cwd: string, rel: string): Promise<boolean>;
/** Compact file list for the system prompt so the model knows the workspace. */
export declare function workspaceSnapshot(cwd: string, limit?: number): Promise<string>;
