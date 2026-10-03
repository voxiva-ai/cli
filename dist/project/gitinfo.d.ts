export type GitSnapshot = {
    branch: string;
    dirty: boolean;
    status: string;
    recent: string[];
};
export declare function readGitSnapshot(cwd: string): GitSnapshot | null;
