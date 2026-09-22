import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import stringWidth from "string-width";
import {
  composeFrame,
  inputBar,
  inputBox,
  renderHeader,
  statusFooter,
} from "../dist/tui/layout.js";
import { matchesPaletteFilter, resolveSlash, slashSuggestions, paletteItems } from "../dist/tui/slash.js";
import { themeIds, THEMES } from "../dist/tui/themes.js";
import { planSystem, planSystemAsync } from "../dist/plans/index.js";
import { estimateTokens, formatUsage, emptyUsage } from "../dist/usage/tokens.js";
import { withAgentsContext } from "../dist/project/agents.js";
import { VERSION } from "../dist/tui/copy.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

test("header details line expands when provided", () => {
  const lines = renderHeader(
    {
      version: "0.1.0",
      plan: "explore",
      planId: "explore",
      model: "gpt-4.1-mini",
      authKeys: ["openai"],
      detailsLine: "theme ember · lang ru · 100 tokens",
    },
    80,
  );
  assert.equal(lines.length, 5);
  assert.ok(lines[3].includes("ember"));
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
  assert.equal(resolveSlash("/conn")?.cmd.name, "connect");
  assert.equal(resolveSlash("/cost")?.cmd.name, "cost");
  assert.equal(resolveSlash("/diff")?.cmd.name, "diff");
  assert.equal(resolveSlash("/usage")?.cmd.name, "cost");
  assert.ok(slashSuggestions("/th").some((command) => command.name === "themes"));
  assert.ok(slashSuggestions("/au").some((command) => command.name === "connect"));
});

test("palette filter matches command aliases", () => {
  const commands = paletteItems();
  const connect = commands.find((command) => command.name === "connect");
  assert.ok(connect);
  assert.ok(matchesPaletteFilter(connect, "auth"));
});


test("themes include ember forest mono", () => {
  const ids = themeIds();
  assert.ok(ids.includes("ember"));
  assert.ok(ids.includes("forest"));
  assert.ok(ids.includes("mono"));
  assert.equal(THEMES.length, 7);
});

test("version is beta 0.1.0", () => {
  assert.equal(VERSION, "0.1.0");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(pkg.version, "0.1.0");
});

test("plan system injects language and agents context", async () => {
  const en = planSystem("build", "en");
  assert.ok(en.includes("Build"));
  const withAgents = withAgentsContext(en, "# Rules\nUse Go.");
  assert.ok(withAgents.includes("AGENTS.md"));
  assert.ok(withAgents.includes("Use Go."));
  const asyncPrompt = await planSystemAsync("explore", "ru", root);
  assert.ok(asyncPrompt.length > 20);
});

test("token usage helpers", () => {
  assert.ok(estimateTokens("abcd") >= 1);
  const usage = emptyUsage();
  usage.inputTokens = 100;
  usage.outputTokens = 50;
  usage.turns = 2;
  assert.ok(formatUsage(usage).includes("150"));
});

test("new overlays resolve from slash", () => {
  assert.equal(resolveSlash("/files")?.cmd.name, "files");
  assert.equal(resolveSlash("/open")?.cmd.name, "files");
  assert.equal(resolveSlash("/context")?.cmd.name, "context");
  assert.equal(resolveSlash("/ctx")?.cmd.name, "context");
  assert.equal(resolveSlash("/shortcuts")?.cmd.name, "shortcuts");
  assert.equal(resolveSlash("/settings")?.cmd.name, "settings");
  assert.equal(resolveSlash("/history")?.cmd.name, "history");
  assert.equal(resolveSlash("/branch")?.cmd.name, "branch");
  assert.equal(resolveSlash("/git")?.cmd.name, "branch");
  assert.equal(resolveSlash("/queue")?.cmd.name, "queue");
  assert.equal(resolveSlash("/memory")?.cmd.name, "memory");
  assert.equal(resolveSlash("/copy")?.cmd.name, "copy");
  assert.equal(resolveSlash("/retry")?.cmd.name, "retry");
  assert.equal(resolveSlash("/review")?.cmd.name, "review");
  assert.equal(resolveSlash("/explain")?.cmd.name, "explain");
});

test("memory and review actions return action results", async () => {
  const memory = resolveSlash("/memory remember use go fmt");
  assert.ok(memory);
  const memoryResult = await memory.cmd.handler("remember use go fmt", {
    cwd: root,
    plan: "build",
    theme: "voxiva",
    locale: "en",
    setPlan: async () => {},
    setModel: async () => {},
    setTheme: async () => {},
    setLocale: async () => {},
    refresh: async () => {},
  });
  assert.equal(memoryResult.type, "action");
  if (memoryResult.type === "action") {
    assert.equal(memoryResult.action, "memory-add");
    assert.equal(memoryResult.args, "remember use go fmt");
  }

  const files = resolveSlash("/files");
  assert.ok(files);
  const filesResult = await files.cmd.handler("", {
    cwd: root,
    plan: "build",
    theme: "voxiva",
    locale: "en",
    setPlan: async () => {},
    setModel: async () => {},
    setTheme: async () => {},
    setLocale: async () => {},
    refresh: async () => {},
  });
  assert.deepEqual(filesResult, { type: "overlay", mode: "files" });
});

test("one-line install scripts exist", () => {
  assert.ok(existsSync(join(root, "install")));
  assert.ok(existsSync(join(root, "install.ps1")));
  const sh = readFileSync(join(root, "install"), "utf8");
  assert.ok(sh.includes("npm install -g"));
  assert.ok(sh.includes("github:voxiva-ai/cli"));
});
