import assert from "node:assert/strict";
import test from "node:test";
import stringWidth from "string-width";
import {
  composeFrame,
  inputBar,
  inputBox,
  renderHeader,
  statusFooter,
} from "../dist/tui/layout.js";
import { matchesPaletteFilter, resolveSlash, slashSuggestions } from "../dist/tui/slash.js";

test("input bar draws a blinking caret when empty", () => {
  const on = inputBar(80, "", 0, "Type here", { blink: true });
  const off = inputBar(80, "", 0, "Type here", { blink: false });
  assert.ok(on.lines[1].includes("▋") || on.lines.some((l) => l.includes("▋")));
  assert.notEqual(on.lines[1], off.lines[1]);
});

test("listen mode uses voice prompt styling", () => {
  const listen = inputBar(80, "", 0, "Type here", { blink: true, mode: "listen" });
  assert.ok(listen.lines.some((line) => line.includes("Listening") || line.includes("●")));
});

test("input bar spans full terminal width", () => {
  const result = inputBar(80, "hello", 5, "Ask anything…");
  for (const line of result.lines) assert.ok(stringWidth(line) <= 80);
  assert.equal(result.lines.length, 3);
});

test("input box alias matches input bar", () => {
  const bar = inputBar(60, "test", 2, "placeholder");
  const box = inputBox(60, "test", 2, "placeholder");
  assert.deepEqual(bar.lines, box.lines);
});

test("long Unicode input keeps cursor inside the bar", () => {
  const input = "привет 😀 ".repeat(12);
  const result = inputBar(80, input, input.length, "placeholder");
  assert.ok(result.inputCol > 0);
  assert.ok(result.inputCol < 80);
});

test("header is compact with title and status line", () => {
  const lines = renderHeader(
    {
      version: "0.1.0",
      plan: "build",
      planId: "build",
      model: "gpt-4.1-mini",
      authKeys: ["openai"],
    },
    80,
  );
  assert.equal(lines.length, 4);
  assert.ok(lines[1].includes("Voxiva CLI"));
  assert.ok(lines[2].includes("gpt-4.1-mini"));
  assert.ok(!lines[2].includes("/models"));
});

test("footer is pinned with input bar above status columns", () => {
  const pinned = ["", "> input", ""];
  const footer = ["rule", "status"];
  const frame = composeFrame(
    ["header", "body"],
    80,
    16,
    pinned,
    footer,
    { inputRow: 1, inputCol: 3 },
  );
  assert.equal(frame.lines.length, 16);
  assert.deepEqual(frame.lines.slice(-5), [...pinned, ...footer]);
});

test("footer shows workspace only", () => {
  const line = statusFooter({ cwd: "~/proj" }, 80);
  assert.ok(line.includes("~/proj"));
  assert.ok(!line.includes("plan"));
});

test("slash aliases resolve and suggestions filter", () => {
  assert.equal(resolveSlash("/summarize")?.cmd.name, "compact");
  assert.equal(resolveSlash("/resume")?.cmd.name, "sessions");
  assert.equal(resolveSlash("/status")?.cmd.name, "doctor");
  assert.equal(resolveSlash("/con")?.cmd.name, "connect");
  assert.ok(slashSuggestions("/th").some((command) => command.name === "themes"));
  assert.ok(slashSuggestions("/au").some((command) => command.name === "connect"));
});

test("palette filter matches command aliases", () => {
  const commands = slashSuggestions("/");
  const connect = commands.find((command) => command.name === "connect");
  assert.ok(connect);
  assert.ok(matchesPaletteFilter(connect, "auth"));
});
