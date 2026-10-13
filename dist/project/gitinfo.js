import { execSync } from "node:child_process";
function run(cwd, command) {
    return execSync(command, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
    }).trim();
}
export function readGitSnapshot(cwd) {
    try {
        const branch = run(cwd, "git rev-parse --abbrev-ref HEAD");
        const status = run(cwd, "git status -sb");
        const dirty = status.split("\n").slice(1).some(Boolean);
        let recent = [];
        try {
            recent = run(cwd, "git log -5 --oneline")
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean);
        }
        catch {
            recent = [];
        }
        return { branch, dirty, status, recent };
    }
    catch {
        return null;
    }
}
