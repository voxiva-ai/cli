import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  extractFileBlocks,
  prepareEdits,
  applyEdits,
  stripFileBlocks,
} from "../dist/project/edits.js";

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
