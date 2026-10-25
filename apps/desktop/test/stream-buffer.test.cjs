const assert = require("node:assert/strict");
const test = require("node:test");
const { createStreamBuffer } = require("../stream-buffer.js");

test("streamed chunks are rendered together once per frame", () => {
  const frames = new Map();
  const writes = [];
  let nextId = 0;
  const buffer = createStreamBuffer({
    schedule(callback) { const id = ++nextId; frames.set(id, callback); return id; },
    cancel(id) { frames.delete(id); },
    write(text) { writes.push(text); },
  });

  buffer.push("a");
  buffer.push("b");
  assert.deepEqual(writes, []);
  assert.equal(frames.size, 1);
  const [frame] = frames.values();
  frames.clear();
  frame();
  assert.deepEqual(writes, ["ab"]);
});

test("clearing a stream cancels queued text", () => {
  const frames = new Map();
  const writes = [];
  const buffer = createStreamBuffer({
    schedule(callback) { frames.set(1, callback); return 1; },
    cancel(id) { frames.delete(id); },
    write(text) { writes.push(text); },
  });
  buffer.push("stale");
  buffer.clear();
  assert.equal(frames.size, 0);
  assert.deepEqual(writes, []);
});
