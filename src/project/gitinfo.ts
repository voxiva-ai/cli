import { execSync } from "node:child_process";

export type GitSnapshot = {
  branch: string;
  dirty: boolean;
  status: string;
  recent: string[];
};

function run(cwd: string, command: string): string {
  return execSync(command, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function readGitSnapshot(cwd: string): GitSnapshot | null {
  try {
    const branch = run(cwd, "git rev-parse --abbrev-ref HEAD");
    const status = run(cwd, "git status -sb");
    const dirty = status.split("\n").length > 1 || status.includes("...");
    let recent: string[] = [];
    try {
      recent = run(cwd, "git log -5 --oneline")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    } catch {
      recent = [];
    }
    return { branch, dirty: status.includes(" M") || status.includes("??") || status.includes("A "), status, recent };
  } catch {
    return null;
  }
}
