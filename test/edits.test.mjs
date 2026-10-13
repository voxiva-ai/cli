import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  extractFileBlocks,
  prepareEdits,
  applyEdits,
  stripFileBlocks,
} from "../dist/project/edits.js";
import { readRequestedFiles } from "../dist/project/files.js";

test("extract and apply file edit blocks", async () => {
  const text = `I'll update the readme.

<<<FILE path="notes.txt" action="write">>>
hello voxiva
line 2
<<<END>>>

Done.`;
  const blocks = extractFileBlocks(text);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].path, "notes.txt");
  assert.ok(blocks[0].content.includes("hello voxiva"));
  assert.equal(stripFileBlocks(text).includes("<<<FILE"), false);
  assert.ok(stripFileBlocks(text).includes("I'll update"));

  const dir = await mkdtemp(join(tmpdir(), "voxiva-edit-"));
  try {
    const edits = await prepareEdits(dir, blocks);
    assert.equal(edits.length, 1);
    assert.equal(edits[0].exists, false);
    await applyEdits(dir, edits);
    const written = await readFile(join(dir, "notes.txt"), "utf8");
    assert.equal(written, "hello voxiva\nline 2");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("rejects path traversal in file blocks", async () => {
  const blocks = extractFileBlocks(`<<<FILE path="../secret.txt" action="write">>>
x
<<<END>>>`);
  assert.equal(blocks.length, 0);
});

test("rejects project symlinks that point outside the workspace", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "voxiva-link-root-"));
  const outside = await mkdtemp(join(tmpdir(), "voxiva-link-outside-"));
  const secret = join(outside, "secret.txt");
  try {
    await writeFile(secret, "private", "utf8");
    await symlink(secret, join(root, "linked.txt"));
    assert.ok((await readRequestedFiles(root, ["linked.txt"])).includes("Access denied."));
    assert.deepEqual(await prepareEdits(root, [{ path: "linked.txt", action: "write", content: "exposed" }]), []);
    await assert.rejects(
      applyEdits(root, [{ path: "linked.txt", action: "write", content: "exposed", exists: true, preview: "" }]),
      /outside the workspace/,
    );
    assert.equal(await readFile(secret, "utf8"), "private");
  } catch (error) {
    if (["EPERM", "EACCES"].includes(error?.code)) return t.skip("symlink creation is not permitted");
    throw error;
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
