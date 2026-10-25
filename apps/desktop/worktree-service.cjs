const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const { promisify } = require("node:util");

const runFile = promisify(execFile);
async function git(args, cwd) { return (await runFile("git", args, { cwd, encoding: "utf8", timeout: 30000, windowsHide: true })).stdout.trim(); }

async function createWorktree({ cwd, name }) {
  if (typeof cwd !== "string" || !cwd.trim()) throw new Error("Choose a project folder first.");
  if (typeof name !== "string") throw new Error("Enter a worktree name.");
  if (name.length > 80) throw new Error("Worktree names must be 80 characters or fewer.");
  const slug = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40).replace(/-$/g, "");
  if (!slug) throw new Error("Use letters or numbers in the worktree name.");

  let root;
  try { root = await git(["rev-parse", "--show-toplevel"], fs.realpathSync(cwd)); }
  catch { throw new Error("New worktrees require a Git repository."); }
  const hasChanges = Boolean(await git(["status", "--porcelain"], root));

  const branch = `voxiva/${slug}`;
  const folder = path.join(path.dirname(root), `${path.basename(root)}-${slug}`);
  if (await git(["branch", "--list", "--format=%(refname:short)", branch], root) === branch) throw new Error(`Branch ${branch} already exists.`);
  if (fs.existsSync(folder)) throw new Error(`Folder ${folder} already exists.`);

  try { await git(["worktree", "add", "-b", branch, folder, "HEAD"], root); }
  catch (error) { throw new Error(`Could not create the worktree: ${error.stderr?.toString().trim() || error.message}`); }
  return { cwd: folder, branch, hasChanges };
}

async function getMainWorktree(cwd) {
  if (typeof cwd !== "string" || !cwd.trim()) throw new Error("Choose a project folder first.");
  try {
    const output = await git(["worktree", "list", "--porcelain"], fs.realpathSync(cwd));
    const first = output.split(/\r?\n/).find((line) => line.startsWith("worktree "));
    if (!first) throw new Error("Git did not report a main worktree.");
    return first.slice("worktree ".length);
  } catch (error) {
    throw new Error(error.message.includes("Git did not") ? error.message : "The project is not an available Git worktree.");
  }
}

module.exports = { createWorktree, getMainWorktree };
