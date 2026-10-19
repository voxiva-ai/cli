const assert = require("node:assert/strict");
const test = require("node:test");
const { createOutputFilter } = require("../output-filter.cjs");

test("streams prose while hiding file proposals, including split markers", () => {
  const filter = createOutputFilter();
  const chunks = ["I'll update ", "<<<", "FILE path=\"src/a.js\" action=\"write\">>>", "secret contents", "<<<END>>>", " and keep going."];
  const output = chunks.map((chunk) => filter.push(chunk)).join("") + filter.finish();
  assert.equal(output, "I'll update  and keep going.");
  assert.doesNotMatch(output, /<<<|secret contents/);
});

test("hides file reads and preserves ordinary streamed text", () => {
  const filter = createOutputFilter();
  const output = ["Read this ", "<<<READ path=\"src/a.js\">>>", "private response"].map((chunk) => filter.push(chunk)).join("") + filter.finish();
  assert.equal(output, "Read this ");
  const plain = createOutputFilter();
  assert.equal(plain.push("A regular ") + plain.push("answer.") + plain.finish(), "A regular answer.");
});
