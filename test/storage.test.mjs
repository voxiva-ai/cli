import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileAtomic } from "../dist/config/store.js";

test("atomic writes replace existing files and clean temporary files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "voxiva-storage-"));
  const path = join(dir, "state.json");
  try {
    await writeFile(path, "old", "utf8");
    await writeFileAtomic(path, "new");
    assert.equal(await readFile(path, "utf8"), "new");
    assert.deepEqual(await readdir(dir), ["state.json"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
