import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync, mkdtempSync, writeFileSync, unlinkSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import stringWidth from "string-width";
import {
  composeFrame,
  centeredPanel,
  inputBar,
  inputBox,
  renderHeader,
  statusFooter,
  thoughtLine,
  wrapText,
  THOUGHT_FRAMES,
} from "../dist/tui/layout.js";
import { matchesPaletteFilter, resolveSlash, slashSuggestions, paletteItems } from "../dist/tui/slash.js";
import { themeIds, THEMES } from "../dist/tui/themes.js";
import { planSystem, planSystemAsync } from "../dist/plans/index.js";
import { estimateTokens, formatUsage, emptyUsage, usagePanelLines } from "../dist/usage/tokens.js";
import { withAgentsContext } from "../dist/project/agents.js";
import { VERSION } from "../dist/tui/copy.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("thoughtLine is a quiet spinner without action text", () => {
  const line = thoughtLine(0, "thinking", 80);
  assert.ok(line.includes(THOUGHT_FRAMES[0]));
  assert.ok(!line.includes("thinking"));
  assert.ok(!line.includes("\n"));
  assert.ok(stringWidth(line) <= 80);
  const next = thoughtLine(1, "drafting", 40);
  assert.ok(next.includes(THOUGHT_FRAMES[1]));
  assert.ok(!next.includes("drafting"));
});

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

test("long words wrap without disappearing", () => {
  const text = "averyveryverylongidentifier";
  const lines = wrapText(text, 10);
  assert.equal(lines.join(""), text);
  assert.ok(lines.every((line) => stringWidth(line) <= 10));
});

test("header shows model, plan, and project directory", () => {
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
  assert.ok(stringWidth(lines[0]) <= 56);
});

test("narrow header keeps the full model and explains the active plan", () => {
  const lines = renderHeader(
    {
      version: "0.1.3",
      plan: "Check",
      planId: "check",
      model: "Nemotron 3 Ultra Free",
      directory: "D:/JobHunter",
    },
    54,
  );
  assert.ok(lines.some((line) => line.includes("Nemotron 3 Ultra Free")));
  assert.ok(lines.some((line) => line.includes("review only")));
  assert.ok(lines.every((line) => stringWidth(line) <= 54));
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
  const usageHit = resolveSlash("/usage");
  assert.ok(usageHit);
  assert.deepEqual(await usageHit.cmd.handler("", /** @type {any} */ ({})), {
    type: "overlay",
    mode: "usage",
  });
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
  assert.ok(ids.includes("auto"));
  assert.ok(ids.includes("ember"));
  assert.ok(ids.includes("forest"));
  assert.ok(ids.includes("mono"));
  assert.equal(THEMES.length, 8);
});

test("auto theme follows COLORFGBG background when available", async () => {
  const { getTheme } = await import("../dist/tui/themes.js");
  const previous = process.env.COLORFGBG;
  try {
    process.env.COLORFGBG = "7;15";
    assert.equal(getTheme("auto").id, "arctic");
    process.env.COLORFGBG = "15;0";
    assert.equal(getTheme("auto").id, "voxiva");
  } finally {
    if (previous === undefined) delete process.env.COLORFGBG;
    else process.env.COLORFGBG = previous;
  }
});

test("version is beta 0.1.4", () => {
  assert.equal(VERSION, "0.1.4");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(pkg.version, "0.1.4");
});

test("plan system injects language and agents context", async () => {
  const en = planSystem("build", "en");
  assert.ok(en.includes("Build"));
  assert.ok(en.includes('<<<READ path="relative/path.ext">>>'));
  const withAgents = withAgentsContext(en, "# Rules\nUse Go.");
  assert.ok(withAgents.includes("AGENTS.md"));
  assert.ok(withAgents.includes("Use Go."));
  const asyncPrompt = await planSystemAsync("explore", "ru", root);
  assert.ok(asyncPrompt.length > 20);
});

test("Russian prompts select Russian and replies follow the latest message", async () => {
  const { detectPromptLocale, languageDirective } = await import("../dist/i18n/index.js");
  assert.equal(detectPromptLocale("Напиши код"), "ru");
  assert.equal(detectPromptLocale("write code"), undefined);
  assert.ok(languageDirective("ru").includes("latest message"));
});

test("agent file reads stay inside the project and hide secrets", async () => {
  const { extractReadPaths, readRequestedFiles, stripReadBlocks } =
    await import("../dist/project/files.js");
  const reply = 'Checking.\n<<<READ path="package.json">>>\n<<<READ path="../secret.txt">>>';
  assert.deepEqual(extractReadPaths(reply), ["package.json", "../secret.txt"]);
  assert.equal(stripReadBlocks(reply), "Checking.");
  const context = await readRequestedFiles(root, ["package.json", "../secret.txt", ".env"]);
  assert.ok(context.includes('<file path="package.json">'));
  assert.ok(context.includes('<file-error path="../secret.txt">Access denied.'));
  assert.ok(context.includes('<file-error path=".env">Access denied.'));
});

test("token usage helpers", () => {
  assert.ok(estimateTokens("abcd") >= 1);
  const usage = emptyUsage();
  usage.inputTokens = 100;
  usage.outputTokens = 50;
  usage.turns = 2;
  assert.ok(formatUsage(usage).includes("150"));
  const panel = usagePanelLines({
    session: usage,
    today: {
      date: "2026-10-05",
      inputTokens: 200,
      outputTokens: 80,
      turns: 3,
      byModel: { "voxiva/openai-fast": { inputTokens: 200, outputTokens: 80, turns: 3 } },
    },
    model: "voxiva/openai-fast",
    plan: "build",
    cwd: "~/proj",
    contextTokens: 1200,
    free: true,
    locale: "en",
  });
  assert.ok(panel.some((line) => line.includes("Session")));
  assert.ok(panel.some((line) => line.includes("Today")));
  assert.ok(panel.some((line) => line.includes("voxiva/openai-fast")));
  assert.ok(panel.some((line) => /build/.test(line)));
});

test("git snapshot marks deleted tracked files as dirty", async () => {
  const dir = mkdtempSync(join(tmpdir(), "voxiva-gitinfo-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: dir });
    writeFileSync(join(dir, "tracked.txt"), "content");
    execFileSync("git", ["add", "tracked.txt"], { cwd: dir });
    execFileSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "init", "-q"], { cwd: dir });
    unlinkSync(join(dir, "tracked.txt"));
    const { readGitSnapshot } = await import("../dist/project/gitinfo.js");
    assert.equal(readGitSnapshot(dir)?.dirty, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("new overlays resolve from slash", () => {
  assert.equal(resolveSlash("/update")?.cmd.name, "update");
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

test("update slash checks first and its dialog is centered", async () => {
  const command = resolveSlash("/update")?.cmd;
  assert.deepEqual(await command.handler("", {}), { type: "action", action: "check-update" });
  const lines = centeredPanel(["Update available"], 100);
  assert.equal(stringWidth(lines[0]), 100);
  assert.equal(lines[0].startsWith(" ".repeat(21)), true);
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
    migrateModelRef,
    listFreeCatalog,
    listOpenCodeCatalog,
    DEFAULT_FREE_MODEL,
    isFreeModelRef,
    isBuiltinFree,
    providerReady,
  } = await import("../dist/providers/chat.js");
  const catalog = listCatalog();
  assert.ok(catalog.some((m) => m.provider === "deepseek" && m.id === "deepseek-chat"));
  assert.ok(catalog.some((m) => m.provider === "google" && m.id === "gemini-2.5-flash"));
  assert.ok(catalog.some((m) => m.provider === "anthropic" && m.id === "claude-opus-4-8"));
  assert.ok(catalog.some((m) => m.provider === "google" && m.id === "gemini-3.8-flash"));
  assert.ok(!catalog.some((m) => m.id === "gemini-2.0-flash"));
  assert.ok(parseModelRef("deepseek/deepseek-reasoner"));
  assert.ok(parseModelRef("opencode/big-pickle"));
  assert.ok(catalog.some((m) => m.provider === "opencode" && m.id === "deepseek-v4.1-flash" && m.zen));
  assert.equal(migrateModelRef("anthropic/claude-sonnet-4-20250514"), "anthropic/claude-sonnet-4-6");
  assert.equal(migrateModelRef("google/gemini-2.0-flash"), "google/gemini-3.8-flash");
  const free = listFreeCatalog();
  assert.ok(free.length >= 1);
  assert.ok(free.every((m) => m.free), "picker shows free models");
  assert.equal(DEFAULT_FREE_MODEL, "voxiva/big-pickle");
  assert.ok(isFreeModelRef(DEFAULT_FREE_MODEL));
  assert.ok(isBuiltinFree(DEFAULT_FREE_MODEL));
  assert.equal(free.length, 1);
  assert.equal(free[0].label, "Anonymous free fallback");
  assert.equal(listOpenCodeCatalog().length, 0);
  const connectedZen = listOpenCodeCatalog({ opencode: { apiKey: "sk-test" } });
  assert.deepEqual(connectedZen.map((m) => m.id), ["deepseek-v4.1-flash", "deepseek-v4-pro", "deepseek-v4-flash"]);
  assert.ok(connectedZen.every((m) => m.zen && !m.free));
  const connectedFree = listFreeCatalog({ opencode: { apiKey: "sk-test" } });
  assert.ok(connectedFree.length >= 10);
  assert.ok(connectedFree.some((m) => m.label.includes("Big Pickle")));
  assert.ok(connectedFree.some((m) => m.label.includes("Space Bunny")));
  assert.equal(providerReady({}, "voxiva"), true);
  assert.equal(providerReady({}, "opencode"), false);
  assert.equal(providerReady({ opencode: { apiKey: "sk-test" } }, "opencode"), true);
  const { parseModelRef: parseConfigModelRef } = await import("../dist/config/store.js");
  assert.equal(parseConfigModelRef("unknown/model"), null);
  assert.deepEqual(parseConfigModelRef("openai/ gpt-4.1-mini "), { provider: "openai", model: "gpt-4.1-mini" });
  assert.ok(catalog.some((m) => m.builtin));
  assert.ok(connectedFree.some((m) => m.id === "nemotron-3-ultra-free"));
  assert.ok(connectedFree.some((m) => m.id === "step-5-preview-free"));
  assert.ok(connectedFree.some((m) => m.id === "ling-3.1-flash-free"));
  assert.ok(connectedFree.some((m) => m.id === "exo-free"));
  assert.ok(connectedFree.length >= 10, `expected current OpenCode free catalog, got ${connectedFree.length}`);
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

test("preferred model sticks across restarts", async () => {
  const {
    migrateModelRef,
    isUsableModelRef,
    resolvePreferredModel,
    DEFAULT_FREE_MODEL,
  } = await import("../dist/providers/chat.js");

  assert.equal(migrateModelRef("voxiva/mimo-v2.6-flash"), "voxiva/mimo-v2.6-flash-free");
  assert.equal(migrateModelRef("voxiva/deepseek-v4-flash-free"), DEFAULT_FREE_MODEL);

  // Retired built-in ids migrate instead of breaking chat after an update.
  const flash = resolvePreferredModel({
    auth: {},
    workspaceModel: "voxiva/deepseek-v4-flash-free",
    configModel: DEFAULT_FREE_MODEL,
  });
  assert.equal(flash.model, DEFAULT_FREE_MODEL);
  assert.equal(flash.migrated, true);

  // Old OpenCode choices need a key; migrate and keep them when it is present.
  const legacy = resolvePreferredModel({
    auth: { opencode: { apiKey: "sk-test" } },
    configModel: "voxiva/mimo-v2.6-flash",
  });
  assert.equal(legacy.model, "voxiva/mimo-v2.6-flash-free");
  assert.equal(legacy.migrated, true);

  const noKey = resolvePreferredModel({
    auth: {},
    configModel: "voxiva/mimo-v2.6-flash",
  });
  assert.equal(noKey.model, DEFAULT_FREE_MODEL);
  assert.equal(noKey.migrated, true);

  // OpenRouter / BYOK kept when key present — never force-reset on launch.
  assert.equal(
    isUsableModelRef("openrouter/qwen/qwen3-32b:free", { openrouter: { apiKey: "sk-test" } }),
    true,
  );
  assert.equal(isUsableModelRef("openrouter/qwen/qwen3-32b:free", {}), false);
  assert.equal(
    isUsableModelRef("deepseek/deepseek-chat", { deepseek: { apiKey: "sk-test" } }),
    true,
  );
  assert.equal(isUsableModelRef("opencode/deepseek-v4.1-flash", {}), false);
  assert.equal(
    isUsableModelRef("opencode/deepseek-v4.1-flash", { opencode: { apiKey: "sk-test" } }),
    true,
  );

  const byok = resolvePreferredModel({
    auth: { deepseek: { apiKey: "sk-test" } },
    configModel: "deepseek/deepseek-chat",
  });
  assert.equal(byok.model, "deepseek/deepseek-chat");

  const zenModel = resolvePreferredModel({
    auth: { opencode: { apiKey: "sk-test" } },
    configModel: "opencode/deepseek-v4.1-flash",
  });
  assert.equal(zenModel.model, "opencode/deepseek-v4.1-flash");

  // Workspace preference beats global default.
  const folder = resolvePreferredModel({
    auth: { opencode: { apiKey: "sk-test" } },
    workspaceModel: "voxiva/mimo-v2.6-flash-free",
    configModel: "voxiva/big-pickle",
  });
  assert.equal(folder.model, "voxiva/mimo-v2.6-flash-free");
});

test("only the anonymous fallback works without a provider key", async () => {
  const { canUseWithoutKey, DEFAULT_FREE_MODEL, listFreeCatalog, modelRef, streamChat } =
    await import("../dist/providers/chat.js");
  assert.ok(canUseWithoutKey(DEFAULT_FREE_MODEL));
  for (const model of listFreeCatalog()) {
    assert.ok(canUseWithoutKey(modelRef(model)), model.label);
  }
  assert.equal(canUseWithoutKey("voxiva/mimo-v2.6-flash-free"), false);
  assert.equal(canUseWithoutKey("openai/gpt-4.1"), false);
  await assert.rejects(
    streamChat({}, "voxiva/mimo-v2.6-flash-free", [], { onToken() {} }),
    /Connect OpenCode Zen/,
  );
});

test("one-line install scripts bootstrap official Node", () => {
  assert.ok(existsSync(join(root, "install")));
  assert.ok(existsSync(join(root, "install.cmd")));
  assert.ok(existsSync(join(root, "install.ps1")));
  const sh = readFileSync(join(root, "install"), "utf8");
  const cmd = readFileSync(join(root, "install.cmd"), "utf8");
  const ps = readFileSync(join(root, "install.ps1"), "utf8");
  assert.ok(sh.includes("nodejs.org/dist"));
  assert.ok(sh.includes("npmmirror.com") || sh.includes("cdn.npmmirror.com"));
  assert.ok(sh.includes("github:voxiva-ai/cli") || sh.includes("github:${REPO}"));
  assert.ok(sh.includes(".voxiva/runtime"));
  assert.ok(ps.includes("nodejs.org/dist"));
  assert.ok(ps.includes("npmmirror.com") || ps.includes("cdn.npmmirror.com"));
  assert.ok(ps.includes("github:$Repo") || ps.includes("github:voxiva-ai/cli"));
  assert.ok(ps.includes(".voxiva"));
  assert.ok(cmd.includes("ExecutionPolicy Bypass"));
  assert.ok(cmd.includes("%USERPROFILE%\\.voxiva\\bin\\voxiva.cmd"));
});

test("built dist is shipped for github installs", () => {
  assert.ok(existsSync(join(root, "dist", "index.js")));
  assert.ok(existsSync(join(root, "dist", "cli.js")));
  assert.ok(existsSync(join(root, "dist", "build.json")));
});
test("compareVersions detects newer releases", async () => {
  const { compareVersions, hasUpdate, newestUpdate } = await import("../dist/update/check.js");
  assert.equal(compareVersions("0.0.1", "0.0.0"), 1);
  assert.equal(compareVersions("0.0.0", "0.0.1"), -1);
  assert.equal(compareVersions("v0.0.0", "0.0.0"), 0);
  assert.equal(hasUpdate("0.1.3", "0.1.3", "abc", "def"), true);
  assert.equal(hasUpdate("0.1.3", "0.1.3", "abc", "abc"), false);
  assert.deepEqual(
    newestUpdate([
      { latest: "0.1.2", source: "release" },
      { latest: "0.1.4", source: "main" },
      { latest: "0.1.3", source: "npm" },
    ]),
    { latest: "0.1.4", source: "main" },
  );
});
