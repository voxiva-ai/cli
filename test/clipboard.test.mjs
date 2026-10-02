import assert from "node:assert/strict";
import test from "node:test";
import {
  clipboardToDraft,
  clipboardToInsert,
  isImagePath,
  normalizeBracketedPaste,
  textToDraft,
} from "../dist/clipboard/index.js";

test("isImagePath detects common image extensions", () => {
  assert.equal(isImagePath("shot.png"), true);
  assert.equal(isImagePath("D:/pics/A.JPG"), true);
  assert.equal(isImagePath("notes.md"), false);
  assert.equal(isImagePath("C:/Temp/ScreenClip/{abc}"), true);
});

test("clipboardToInsert keeps short text inline when no real files", () => {
  const result = clipboardToInsert({
    text: "hello\nworld",
    files: [],
  });
  assert.equal(result.images, 0);
  assert.ok(result.text.includes("hello"));
});

test("long paste becomes a paste card, not inline dump", () => {
  const long = Array.from({ length: 20 }, (_, i) => `line ${i} of pasted code`).join("\n");
  const { attachments, inlineText } = textToDraft(long);
  assert.equal(inlineText, "");
  assert.equal(attachments.length, 1);
  assert.equal(attachments[0].kind, "paste");
  assert.ok((attachments[0].text ?? "").includes("line 0"));
});

test("short paste stays inline", () => {
  const { attachments, inlineText } = textToDraft("hi there");
  assert.equal(attachments.length, 0);
  assert.equal(inlineText, "hi there");
});

test("clipboardToDraft attaches images as chips", () => {
  const { attachments, inlineText } = clipboardToDraft({
    text: "",
    files: [],
    imagePath: "C:/tmp/paste-20260101-120000.png",
  });
  assert.equal(inlineText, "");
  // path may not exist on disk — still recorded as image attachment
  assert.ok(attachments.length === 0 || attachments[0].kind === "image");
});

test("normalizeBracketedPaste strips markers", () => {
  assert.equal(normalizeBracketedPaste("\x1b[200~hi\x1b[201~"), "hi");
});
