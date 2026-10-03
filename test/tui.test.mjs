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

test("header is compact Codex-style with model plan directory", () => {
  const lines = renderHeader(
    {
      version: "0.1.0",
      plan: "build",
      planId: "build",
      model: "Qwen Free",
      directory: "~/proj",
    },
    80,
  );
  assert.ok(lines.some((line) => line.includes("Voxiva CLI")));
  assert.ok(lines.some((line) => line.includes("Qwen Free")));
  assert.ok(lines.some((line) => line.includes("/model")));
  assert.ok(lines.some((line) => line.includes("dir")));
  assert.ok(lines.some((line) => line.includes("~/proj")));
  assert.ok(stringWidth(lines[0]) < 55);
});

test("header shows update banner and tip", () => {
  const lines = renderHeader(
    {
      version: "0.1.0",
      plan: "explore",
      planId: "explore",
      model: "Flash",
      directory: "~",
      updateBanner: "v0.1.1 · npm i -g @voxiva/cli",
      tip: "resume with /continue",
    },
    80,
  );
  assert.ok(lines[0].includes("Update"));
  assert.ok(lines.some((line) => line.includes("Tip:")));
  assert.ok(lines.some((line) => line.includes("/continue")));
});

test("footer shows model and workspace", () => {
  const line = statusFooter({ cwd: "~/proj", model: "Flash Free" }, 80);
  assert.ok(line.includes("~/proj"));
  assert.ok(line.includes("Flash Free"));
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

test("slash / lists many commands and filters model", async () => {
  const { slashSuggestions, resolveSlash } = await import("../dist/tui/slash.js");
  const all = slashSuggestions("/");
  assert.ok(all.length >= 20, `expected many commands, got ${all.length}`);
  assert.ok(all.some((c) => c.name === "models"));
  assert.ok(all.some((c) => c.name === "help"));
  assert.ok(all.some((c) => c.name === "continue"));
  assert.ok(all.some((c) => c.name === "apply"));
  assert.ok(all.some((c) => c.name === "reject"));
  const mod = slashSuggestions("/mod");
  assert.ok(mod.some((c) => c.name === "model" || c.name === "models"));
  assert.equal(resolveSlash("/models")?.cmd.name, "models");
  assert.equal(resolveSlash("/model")?.cmd.name, "model");
});

test("slash aliases resolve and suggestions filter", async () => {
  const { resolveSlash, slashSuggestions } = await import("../dist/tui/slash.js");
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

test("continue and workspaces slash commands", () => {
  assert.equal(resolveSlash("/continue")?.cmd.name, "continue");
  assert.equal(resolveSlash("/last")?.cmd.name, "continue");
  assert.equal(resolveSlash("/restore")?.cmd.name, "continue");
  assert.equal(resolveSlash("/workspaces")?.cmd.name, "workspaces");
  assert.equal(resolveSlash("/projects")?.cmd.name, "workspaces");
  assert.equal(resolveSlash("/ws")?.cmd.name, "workspaces");
});

test("catalog includes deepseek and gemini flash", async () => {
  const {
    listCatalog,
    parseModelRef,
    listFreeCatalog,
    DEFAULT_FREE_MODEL,
    isFreeModelRef,
    isBuiltinFree,
    providerReady,
  } = await import("../dist/providers/chat.js");
  const catalog = listCatalog();
  assert.ok(catalog.some((m) => m.provider === "deepseek" && m.id === "deepseek-chat"));
  assert.ok(catalog.some((m) => m.provider === "google" && m.id === "gemini-2.5-flash"));
  assert.ok(parseModelRef("deepseek/deepseek-reasoner"));
  const free = listFreeCatalog();
  assert.ok(free.length >= 1);
  assert.ok(free.every((m) => m.free), "picker shows free models");
  assert.equal(DEFAULT_FREE_MODEL, "voxiva/big-pickle");
  assert.ok(isFreeModelRef(DEFAULT_FREE_MODEL));
  assert.ok(isBuiltinFree(DEFAULT_FREE_MODEL));
  assert.equal(providerReady({}, "voxiva"), true);
  assert.ok(catalog.some((m) => m.builtin));
  assert.ok(free.some((m) => m.label.includes("Big Pickle")));
  assert.ok(free.some((m) => m.label.includes("Space Bunny")));
  assert.ok(free.some((m) => m.id === "nemotron-3-ultra-free"));
  assert.ok(free.length >= 8);
});

test("plan voice does not brand as Voxiva Check", async () => {
  const { planSystem } = await import("../dist/plans/index.js");
  for (const id of ["build", "ship", "check", "explore"]) {
    const sys = planSystem(id, "en");
    assert.ok(sys.includes("not a branded product"), id);
    assert.ok(!/I am Voxiva/i.test(sys), id);
    assert.ok(!/Voxiva Check/i.test(sys), id);
  }
});

test("free models never require a key", async () => {
  const { canUseWithoutKey, DEFAULT_FREE_MODEL, listFreeCatalog, modelRef } =
    await import("../dist/providers/chat.js");
  assert.ok(canUseWithoutKey(DEFAULT_FREE_MODEL));
  for (const model of listFreeCatalog()) {
    assert.ok(canUseWithoutKey(modelRef(model)), model.label);
  }
  assert.equal(canUseWithoutKey("openai/gpt-4.1"), false);
});

test("one-line install scripts bootstrap official Node", () => {
  assert.ok(existsSync(join(root, "install")));
  assert.ok(existsSync(join(root, "install.ps1")));
  const sh = readFileSync(join(root, "install"), "utf8");
  const ps = readFileSync(join(root, "install.ps1"), "utf8");
  assert.ok(sh.includes("nodejs.org/dist"));
  assert.ok(sh.includes("npmmirror.com") || sh.includes("cdn.npmmirror.com"));
  assert.ok(sh.includes("github:voxiva-ai/cli") || sh.includes("github:${REPO}"));
  assert.ok(sh.includes(".voxiva/runtime"));
  assert.ok(ps.includes("nodejs.org/dist"));
  assert.ok(ps.includes("npmmirror.com") || ps.includes("cdn.npmmirror.com"));
  assert.ok(ps.includes("github:$Repo") || ps.includes("github:voxiva-ai/cli"));
  assert.ok(ps.includes(".voxiva"));
});

test("built dist is shipped for github installs", () => {
  assert.ok(existsSync(join(root, "dist", "index.js")));
  assert.ok(existsSync(join(root, "dist", "cli.js")));
});
test("compareVersions detects newer releases", async () => {
  const { compareVersions } = await import("../dist/update/check.js");
  assert.equal(compareVersions("0.0.1", "0.0.0"), 1);
  assert.equal(compareVersions("0.0.0", "0.0.1"), -1);
  assert.equal(compareVersions("v0.0.0", "0.0.0"), 0);
});
