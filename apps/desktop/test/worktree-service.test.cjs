const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const test = require("node:test");
const { createWorktree, getMainWorktree } = require("../worktree-service.cjs");

function repo() {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "voxiva-test-"));
  const root = path.join(parent, "project");
  fs.mkdirSync(root);
  execFileSync("git", ["init", "-b", "main"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-m", "initial"], { cwd: root, stdio: "ignore" });
  return { parent, cwd: root };
}

test("creates a sibling git worktree and branch from the selected project", async (t) => {
  const { parent, cwd } = repo();
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));

  const result = await createWorktree({ cwd, name: "Fix login flow" });

  assert.equal(result.branch, "voxiva/fix-login-flow");
  assert.equal(result.cwd.toLowerCase(), path.join(parent, "project-fix-login-flow").toLowerCase());
  assert.equal(fs.existsSync(path.join(result.cwd, ".git")), true);
  assert.match(execFileSync("git", ["branch", "--list", result.branch], { cwd, encoding: "utf8" }).trim(), new RegExp(result.branch.replace("/", "\\/")));
});

test("refuses a non-git project without creating a sibling folder", async (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "voxiva-plain-"));
  const cwd = path.join(parent, "project");
  fs.mkdirSync(cwd);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));

  await assert.rejects(createWorktree({ cwd, name: "feature" }), /Git repository/);
  assert.deepEqual(fs.readdirSync(parent), ["project"]);
});

test("refuses a colliding branch or sibling directory without overwriting it", async (t) => {
  const { parent, cwd } = repo();
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const folder = path.join(parent, "project-feature");
  fs.mkdirSync(folder);
  fs.writeFileSync(path.join(folder, "keep.txt"), "keep");

  await assert.rejects(createWorktree({ cwd, name: "feature" }), /already exists/);
  assert.equal(fs.readFileSync(path.join(folder, "keep.txt"), "utf8"), "keep");
  assert.equal(execFileSync("git", ["branch", "--list", "voxiva/feature"], { cwd, encoding: "utf8" }).trim(), "");
});

test("refuses an existing branch even when its sibling path is free", async (t) => {
  const { parent, cwd } = repo();
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  execFileSync("git", ["branch", "voxiva/feature"], { cwd });

  await assert.rejects(createWorktree({ cwd, name: "feature" }), /Branch voxiva\/feature already exists/);
  assert.equal(fs.existsSync(path.join(parent, "project-feature")), false);
});

test("rejects overlong worktree names before running git", async (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "voxiva-name-"));
  const cwd = path.join(parent, "project");
  fs.mkdirSync(cwd);
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));

  await assert.rejects(createWorktree({ cwd, name: "x".repeat(81) }), /80 characters or fewer/);
});

test("finds the main checkout when called from a created worktree", async (t) => {
  const { parent, cwd } = repo();
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const created = await createWorktree({ cwd, name: "feature" });

  assert.equal((await getMainWorktree(created.cwd)).replace(/\\/g, "/").toLowerCase(), cwd.replace(/\\/g, "/").toLowerCase());
});

test("reports uncommitted files as staying in the original checkout", async (t) => {
  const { parent, cwd } = repo();
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  fs.writeFileSync(path.join(cwd, "local.txt"), "uncommitted");

  const result = await createWorktree({ cwd, name: "feature" });

  assert.equal(result.hasChanges, true);
  assert.equal(fs.existsSync(path.join(cwd, "local.txt")), true);
  assert.equal(fs.existsSync(path.join(result.cwd, "local.txt")), false);
});
