import { loadAuth, patchConfig, saveAuth, type ModelRef, type PlanId, type ProviderId } from "../config/store.js";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { execSync, spawnSync } from "node:child_process";
import chalk from "chalk";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPlan, PLANS } from "../plans/index.js";
import { listCatalog, modelRef, parseModelRef, type ChatMessage } from "../providers/chat.js";
import { streamChat } from "../providers/chat.js";
import {
  getSession,
  listSessions,
  saveSession,
  type SessionRecord,
} from "../sessions/store.js";
import {
  assistantBubble,
  clearScreen,
  composeFrame,
  contentIndent,
  enterAltScreen,
  errorNote,
  fullWidth,
  hideCursor,
  horizontalRule,
  inputBar,
  leaveAltScreen,
  okNote,
  paintFrame,
  panel,
  renderHeader,
  showCursor,
  statusFooter,
  suggestionRows,
  systemNote,
  termSize,
  truncate,
  userBubble,
  wrapText,
} from "./layout.js";
import { setActiveTheme, tc } from "./logo.js";
import { PLAN_COLORS, THEMES } from "./themes.js";
import type { ThemeId } from "../config/store.js";
import { paletteItems, resolveSlash, slashSuggestions, matchesPaletteFilter, type SlashResult } from "./slash.js";
import type { SlashContext } from "./slash.js";
import { PLACEHOLDER, TIP_NEED_CONNECT, TIP_NEED_MODEL, TIP_QUEUE_BUSY, TIP_VOICE_LISTEN, TIP_VOICE_READY, VERSION } from "./copy.js";
import { setVoiceListening, setVoiceSink } from "../voice/bridge.js";

const PROVIDERS: { id: ProviderId; label: string; description: string }[] = [
  { id: "openai", label: "OpenAI", description: "GPT and reasoning models · OPENAI_API_KEY" },
  { id: "anthropic", label: "Anthropic", description: "Claude models · ANTHROPIC_API_KEY" },
  { id: "openrouter", label: "OpenRouter", description: "One key for many providers · OPENROUTER_API_KEY" },
  { id: "google", label: "Google AI", description: "Gemini models · GEMINI_API_KEY" },
  { id: "groq", label: "Groq", description: "Fast hosted open models · GROQ_API_KEY" },
];

type UiMessage = { role: "user" | "assistant" | "system"; text: string };

type AppState = {
  input: string;
  cursor: number;
  messages: UiMessage[];
  history: ChatMessage[];
  plan: PlanId;
  model?: ModelRef;
  pendingModel?: ModelRef;
  theme: ThemeId;
  authKeys: ProviderId[];
  overlay: import("./slash.js").OverlayMode | null;
  overlayIndex: number;
  paletteFilter: string;
  toast?: { text: string; tone: "ok" | "error" | "info" };
  toastUntil?: number;
  busy: boolean;
  details: boolean;
  thinking: boolean;
  redoStack: { messages: UiMessage[]; history: ChatMessage[] }[];
  sessionId?: string;
  savedSessions: SessionRecord[];
  cwd: string;
  scrollOffset: number;
  connectingProvider: ProviderId | null;
  authKeyInput: string;
  authKeyCursor: number;
  promptQueue: string[];
  /** Soft caret blink phase. */
  caretBlink: boolean;
  /** Highlighted slash suggestion while typing `/…`. */
  suggestIndex: number;
  /** Voxiva Voice capture into the composer. */
  voice: "off" | "listen";
  /** Transcript buffer while listening (lands into input on stop). */
  voiceDraft: string;
};

function shortCwd(cwd: string): string {
  const home = process.env.USERPROFILE || process.env.HOME || "";
  if (home && cwd.startsWith(home)) return "~" + cwd.slice(home.length).replace(/\\/g, "/");
  return cwd.replace(/\\/g, "/");
}

function planLabel(id: PlanId): string {
  return getPlan(id).label;
}

function renderPlan(id: PlanId): string {
  return chalk.bold.hex(PLAN_COLORS[id])(planLabel(id));
}

function modelShort(model?: string): string {
  if (!model) return "no model";
  const slash = model.indexOf("/");
  return slash >= 0 ? model.slice(slash + 1) : model;
}

function previousCodePointIndex(text: string, index: number): number {
  if (index <= 0) return 0;
  const previous = text.charCodeAt(index - 1);
  if (previous >= 0xdc00 && previous <= 0xdfff && index >= 2) return index - 2;
  return index - 1;
}

function nextCodePointIndex(text: string, index: number): number {
  if (index >= text.length) return text.length;
  const current = text.codePointAt(index) ?? 0;
  return Math.min(text.length, index + (current > 0xffff ? 2 : 1));
}

export async function runTui(): Promise<void> {
  const snapshot = process.env.VOXIVA_TUI_SNAPSHOT === "1";
  if (
    !snapshot &&
    (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode)
  ) {
    process.stdout.write("Voxiva TUI requires an interactive terminal. Run: voxiva\n");
    return;
  }

  const { loadConfig } = await import("../config/store.js");
  const config = await loadConfig();
  const auth = await loadAuth();
  const savedSessions = await listSessions();
  const themeId = config.theme ?? "voxiva";
  setActiveTheme(themeId);
  const connectedProviders = Object.entries(auth)
    .filter(([, value]) => value?.apiKey)
    .map(([key]) => key as ProviderId);

  const state: AppState = {
    input: "",
    cursor: 0,
    messages: [],
    history: [{ role: "system", content: getPlan(config.plan).system }],
    plan: config.plan,
    model: config.defaultModel,
    theme: themeId,
    authKeys: connectedProviders,
    overlay:
      snapshot && process.env.VOXIVA_TUI_VIEW
        ? process.env.VOXIVA_TUI_VIEW === "commands"
          ? "palette"
          : process.env.VOXIVA_TUI_VIEW === "connect"
            ? "connect"
            : process.env.VOXIVA_TUI_VIEW === "models"
              ? "models"
              : null
        : null,
    overlayIndex: 0,
    paletteFilter: "",
    busy: false,
    details: false,
    thinking: false,
    redoStack: [],
    savedSessions,
    cwd: process.cwd(),
    scrollOffset: 0,
    connectingProvider: null,
    authKeyInput: "",
    authKeyCursor: 0,
    promptQueue: [],
    caretBlink: true,
    suggestIndex: 0,
    voice: "off",
    voiceDraft: "",
  };

  let running = true;
  let renderQueued = false;
  let lastRenderAt = 0;
  let streamAbort: AbortController | null = null;
  let pasteBuffer = "";
  let inPaste = false;
  const RENDER_MIN_MS = 33;
  let leaderUntil = 0;

  const ctx: SlashContext = {
    cwd: state.cwd,
    plan: state.plan,
    model: state.model,
    theme: state.theme,
    setPlan: async (id) => {
      state.plan = id;
      state.history[0] = { role: "system", content: getPlan(id).system };
      await patchConfig({ plan: id });
    },
    setModel: async (ref) => {
      state.model = ref as ModelRef;
      await patchConfig({ defaultModel: ref as ModelRef });
    },
    setTheme: async (id) => {
      state.theme = id;
      setActiveTheme(id);
      await patchConfig({ theme: id });
    },
    refresh: async () => {
      const fresh = await loadConfig();
      const freshAuth = await loadAuth();
      state.model = fresh.defaultModel;
      state.plan = fresh.plan;
      state.theme = fresh.theme ?? "voxiva";
      setActiveTheme(state.theme);
      state.authKeys = Object.entries(freshAuth)
        .filter(([, v]) => v?.apiKey)
        .map(([k]) => k as ProviderId);
    },
  };

  function toast(text: string, tone: "ok" | "error" | "info" = "info") {
    state.toast = { text, tone };
    state.toastUntil = Date.now() + 2800;
  }

  async function persistSession(): Promise<void> {
    const visible = state.history.filter((message) => message.role !== "system");
    if (!visible.length) return;
    const first = visible.find((message) => message.role === "user")?.content ?? "Untitled session";
    state.sessionId = await saveSession({
      id: state.sessionId,
      title: first.replace(/\s+/g, " ").slice(0, 64),
      plan: state.plan,
      model: state.model,
      messages: state.history,
    });
    state.savedSessions = await listSessions();
  }

  function queueRender(force = false) {
    if (renderQueued) return;
    renderQueued = true;
    setImmediate(() => {
      renderQueued = false;
      const now = Date.now();
      if (!force && state.busy && now - lastRenderAt < RENDER_MIN_MS) {
        queueRender();
        return;
      }
      lastRenderAt = now;
      draw();
    });
  }

  function clampOverlayIndex() {
    const count = overlayItemCount();
    if (count === 0) {
      state.overlayIndex = 0;
      return;
    }
    state.overlayIndex = Math.max(0, Math.min(count - 1, state.overlayIndex));
  }

  function renderOverlay(): string[] {
    const { cols } = termSize();
    const inner = fullWidth(cols) - 8;
    const out: string[] = [];
    const t = tc();

    switch (state.overlay) {
      case "help":
        out.push(t.muted("Commands"));
        out.push("");
        {
          const commands = paletteItems();
          for (let index = 0; index < commands.length; index += 2) {
            const left = commands[index];
            const right = commands[index + 1];
            const leftText = `${t.accent(("/" + left.name).padEnd(13))}${t.dim((left.keybind ?? "").padEnd(12))}`;
            const rightText = right
              ? `${t.accent(("/" + right.name).padEnd(13))}${t.dim(right.keybind ?? "")}`
              : "";
            out.push(`  ${leftText}${rightText}`);
          }
        }
        out.push("");
        out.push(t.dim("  ctrl+p · searchable palette   esc · close"));
        break;
      case "palette": {
        const q = state.paletteFilter.toLowerCase();
        const items = paletteItems().filter((c) => matchesPaletteFilter(c, q));
        out.push(t.muted("Command palette"));
        out.push("");
        const start = Math.max(0, Math.min(state.overlayIndex - 4, items.length - 9));
        items.slice(start, start + 9).forEach((cmd, visibleIndex) => {
          const i = start + visibleIndex;
          const mark = i === state.overlayIndex ? t.accent("› ") : "  ";
          out.push(`${mark}${t.accent("/" + cmd.name)}${t.dim("  " + cmd.description)}`);
        });
        out.push("");
        out.push(t.dim(`  filter: ${state.paletteFilter || "…"}  ·  enter · run  ·  esc · close`));
        break;
      }
      case "connect":
        out.push(t.text("Connect a provider"));
        out.push(t.dim("Choose where Voxiva should send model requests."));
        out.push("");
        PROVIDERS.forEach((p, i) => {
          const mark = i === state.overlayIndex ? t.accent("› ") : "  ";
          const connected = state.authKeys.includes(p.id) ? t.ok(" ✓") : "";
          out.push(`${mark}${t.text(`${i + 1}. ${p.label}`)}${connected}`);
          out.push(`     ${t.dim(p.description)}`);
        });
        out.push("");
        out.push(t.dim("  ↑↓/jk navigate · 1-5 select · enter connect · esc back"));
        break;
      case "connect-key": {
        const provider = state.connectingProvider;
        out.push(t.text(`API key for ${provider ?? "provider"}`));
        out.push(t.dim("Stored locally in ~/.voxiva/auth.json"));
        out.push("");
        const masked = state.authKeyInput.length
          ? t.muted("•".repeat(Math.min(state.authKeyInput.length, 48)))
          : t.dim("paste or type your key…");
        out.push(`  ${masked}`);
        out.push("");
        out.push(t.dim("  enter · save  ·  esc · back"));
        break;
      }
      case "models": {
        out.push(t.text("Select a model"));
        out.push(t.dim("Models marked “auth” need a connected provider."));
        out.push("");
        const models = listCatalog();
        const start = Math.max(0, Math.min(state.overlayIndex - 3, models.length - 6));
        models.slice(start, start + 6).forEach((m, visibleIndex) => {
          const i = start + visibleIndex;
          const ref = modelRef(m);
          const mark = i === state.overlayIndex ? t.accent("› ") : "  ";
          const active = state.model === ref ? t.accent2(" *") : "";
          const ready = state.authKeys.includes(m.provider) ? "" : t.dim(" (auth)");
          out.push(`${mark}${t.text(ref)}${active}${ready}`);
          out.push(`     ${t.dim(m.label)}`);
        });
        out.push("");
        out.push(t.dim("  ↑↓/jk navigate · enter select · esc back"));
        break;
      }
      case "plans":
        out.push(t.muted("Plans"));
        out.push("");
        PLANS.forEach((p, i) => {
          const mark = i === state.overlayIndex ? t.accent("› ") : "  ";
          const active = state.plan === p.id ? t.accent2(" *") : "";
          out.push(`${mark}${renderPlan(p.id)}${active}${t.dim(" — " + p.description)}`);
        });
        out.push("");
        out.push(t.dim("  enter · select  ·  esc · back"));
        break;
      case "themes":
        out.push(t.muted("Themes"));
        out.push("");
        THEMES.forEach((th, i) => {
          const mark = i === state.overlayIndex ? t.accent("› ") : "  ";
          const active = state.theme === th.id ? t.accent2(" *") : "";
          out.push(`${mark}${th.id}${active}${t.dim(" — " + th.label)}`);
        });
        out.push("");
        out.push(t.dim("  enter · apply  ·  esc · back"));
        break;
      case "sessions":
        out.push(t.muted("Sessions"));
        out.push("");
        if (!state.savedSessions.length) {
          out.push(t.dim("  No saved sessions yet."));
        } else {
          state.savedSessions.slice(0, 10).forEach((session, index) => {
            const mark = index === state.overlayIndex ? t.accent("› ") : "  ";
            const date = new Date(session.updatedAt).toLocaleDateString();
            const meta = `${session.plan}${session.model ? ` · ${modelShort(session.model)}` : ""}`;
            out.push(
              `${mark}${truncate(session.title, inner - 28)}${t.dim(`  ${meta}  ${date}`)}`,
            );
          });
        }
        out.push("");
        out.push(t.dim("  enter · resume  ·  esc · back"));
        break;
      case "providers":
        out.push(t.muted("Status"));
        out.push("");
        out.push(`  ${t.muted("Node")}     ${process.version}`);
        out.push(`  ${t.muted("Theme")}   ${state.theme}`);
        out.push(`  ${t.muted("Plan")}     ${state.plan}`);
        out.push(`  ${t.muted("Model")}    ${state.model ?? "—"}`);
        out.push(`  ${t.muted("Auth")}     ${state.authKeys.length ? state.authKeys.join(", ") : "none"}`);
        out.push("");
        out.push(t.dim("  esc · back"));
        break;
    }
    return out;
  }

  function activeSuggestions() {
    return slashSuggestions(state.input);
  }

  function ghostForInput(): string {
    if (!state.input.startsWith("/") || state.input.includes(" ")) return "";
    const suggestions = activeSuggestions();
    if (!suggestions.length) return "";
    const selected = suggestions[Math.min(state.suggestIndex, suggestions.length - 1)];
    if (!selected) return "";
    const typed = state.input.slice(1).toLowerCase();
    const name = selected.name;
    if (!name.toLowerCase().startsWith(typed)) return "";
    return name.slice(typed.length) + " ";
  }

  function acceptSuggestion(index?: number) {
    const suggestions = activeSuggestions();
    if (!suggestions.length) return false;
    const selected = suggestions[Math.min(index ?? state.suggestIndex, suggestions.length - 1)];
    if (!selected) return false;
    state.input = `/${selected.name} `;
    state.cursor = state.input.length;
    state.suggestIndex = 0;
    queueRender();
    return true;
  }

  function pushSlashSuggestions(target: string[]) {
    const suggestions = activeSuggestions();
    if (!suggestions.length) return;
    state.suggestIndex = Math.max(0, Math.min(state.suggestIndex, suggestions.length - 1));
    const { cols } = termSize();
    target.push(
      ...suggestionRows(
        suggestions.map((command, index) => ({
          name: command.name,
          description: command.description,
          selected: index === state.suggestIndex,
        })),
        cols,
        "↑↓ · Tab · Enter",
      ),
    );
  }

  function draw() {
    const { cols, rows } = termSize();
    const inner = fullWidth(cols) - 8;
    const body: string[] = [];
    const pinned: string[] = [];
    let cursorInBox = { inputRow: 0, inputCol: 0 };
    const t = tc();
    const header = renderHeader(
      {
        version: VERSION,
        plan: state.plan,
        planId: state.plan,
        model: state.model ? modelShort(state.model) : undefined,
        authKeys: state.authKeys,
      },
      cols,
    );

    if (state.overlay) {
      body.push(...header);
      body.push("");
      body.push(...panel(renderOverlay(), cols));
    } else if (state.messages.length === 0) {
      body.push(...header);
    } else {
      body.push(...header);
      body.push("");
      const messageRows: string[] = [];
      const indent = contentIndent(cols);
      for (const msg of state.messages) {
        const prefix = msg.role === "user" ? t.accent("› ") : t.dim("  ");
        const wrapped = wrapText(
          msg.text || (state.busy ? (state.thinking ? "Thinking…" : "Working…") : ""),
          inner,
        );
        wrapped.forEach((line, index) => {
          const bodyText =
            msg.role === "user"
              ? userBubble(line)
              : msg.role === "assistant"
                ? assistantBubble(line)
                : systemNote(line);
          messageRows.push(indent + (index === 0 ? prefix : "  ") + bodyText);
        });
        messageRows.push("");
      }
      const maxVisible = Math.max(2, rows - 16);
      const total = messageRows.length;
      const maxScroll = Math.max(0, total - maxVisible);
      state.scrollOffset = Math.min(state.scrollOffset, maxScroll);
      const start = Math.max(0, total - maxVisible - state.scrollOffset);
      body.push(...messageRows.slice(start, start + maxVisible));
      if (state.scrollOffset > 0) {
        body.push(`  ${t.dim(`↑ ${state.scrollOffset} older messages`)}`);
      }
    }

    if (state.toast && state.toastUntil && Date.now() < state.toastUntil) {
      body.push("");
      const toastText =
        state.toast.tone === "ok"
          ? okNote(state.toast.text)
          : state.toast.tone === "error"
            ? errorNote(state.toast.text)
            : systemNote(state.toast.text);
      body.push(`  ${toastText}`);
    }

    if (!state.overlay) {
      pinned.push("");
      const suggestBlock: string[] = [];
      pushSlashSuggestions(suggestBlock);
      if (suggestBlock.length) {
        pinned.push(...suggestBlock);
        pinned.push("");
      }
      const box = inputBar(cols, state.input, state.cursor, PLACEHOLDER, {
        blink: state.caretBlink,
        mode: state.voice === "listen" ? "listen" : "type",
        ghost: ghostForInput(),
      });
      const boxTop = pinned.length;
      pinned.push(...box.lines);
      cursorInBox = { inputRow: boxTop + box.inputRow, inputCol: box.inputCol };
    }

    const footer = [
      horizontalRule(cols),
      statusFooter(
        {
          cwd: shortCwd(state.cwd),
          busy: state.busy,
          queued: state.promptQueue.length,
        },
        cols,
      ),
    ];

    const frame = composeFrame(body, cols, rows, pinned, footer, cursorInBox, "top");
    if (snapshot) {
      clearScreen();
      process.stdout.write(frame.lines.join("\n"));
    } else {
      paintFrame(frame.lines, cols);
    }

    if (!snapshot && !state.overlay) {
      // Soft ▋ caret is painted in the bar; park hardware cursor on it (hidden).
      hideCursor();
      process.stdout.write(`\x1b[${frame.inputRow};${frame.inputCol}H`);
    }
  }

  async function runAction(action: Extract<SlashResult, { type: "action" }>["action"]) {
    switch (action) {
      case "undo": {
        let userIndex = -1;
        for (let index = state.messages.length - 1; index >= 0; index--) {
          if (state.messages[index].role === "user") {
            userIndex = index;
            break;
          }
        }
        if (userIndex < 0) {
          toast("Nothing to undo.", "info");
          return;
        }
        state.redoStack.push({
          messages: state.messages.slice(userIndex),
          history: state.history.slice(userIndex + 1),
        });
        state.messages = state.messages.slice(0, userIndex);
        state.history = state.history.slice(0, userIndex + 1);
        toast("Last turn removed. Use /redo to restore it.", "ok");
        return;
      }
      case "redo": {
        const saved = state.redoStack.pop();
        if (!saved) {
          toast("Nothing to redo.", "info");
          return;
        }
        state.messages.push(...saved.messages);
        state.history.push(...saved.history);
        toast("Turn restored.", "ok");
        return;
      }
      case "compact": {
        const nonSystem = state.history.filter((message) => message.role !== "system");
        if (nonSystem.length < 4) {
          toast("Conversation is already compact.", "info");
          return;
        }
        const kept = nonSystem.slice(-4);
        const summary = `Earlier context compacted (${nonSystem.length - kept.length} messages).`;
        const systemMsg = state.history.find((message) => message.role === "system");
        state.history = [
          systemMsg ?? { role: "system", content: getPlan(state.plan).system },
          { role: "user", content: summary },
          ...kept,
        ];
        state.messages = [
          { role: "system", text: summary },
          ...kept.map((message) => ({
            role: message.role as "user" | "assistant",
            text: message.content,
          })),
        ];
        toast("Conversation compacted.", "ok");
        return;
      }
      case "export": {
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const path = join(state.cwd, `voxiva-session-${stamp}.md`);
        const markdown = [
          "# Voxiva session",
          "",
          `- Plan: ${state.plan}`,
          `- Model: ${state.model ?? "none"}`,
          "",
          ...state.messages.flatMap((message) => [
            `## ${message.role === "user" ? "You" : message.role === "assistant" ? "Voxiva" : "System"}`,
            "",
            message.text,
            "",
          ]),
        ].join("\n");
        await writeFile(path, markdown, "utf8");
        toast(`Exported: ${path}`, "ok");
        return;
      }
      case "init": {
        const path = join(state.cwd, "AGENTS.md");
        try {
          await readFile(path, "utf8");
          toast("AGENTS.md already exists.", "info");
        } catch {
          await writeFile(
            path,
            "# AGENTS.md\n\n## Project\n\nDescribe the project here.\n\n## Commands\n\n- Build: add command\n- Test: add command\n\n## Conventions\n\n- Follow the existing code style.\n",
            "utf8",
          );
          toast("Created AGENTS.md.", "ok");
        }
        return;
      }
      case "details":
        state.details = !state.details;
        toast(`Details ${state.details ? "on" : "off"}.`, "ok");
        return;
      case "thinking":
        state.thinking = !state.thinking;
        toast(`Thinking status ${state.thinking ? "on" : "off"}.`, "ok");
        return;
      case "voice":
        toggleVoice();
        return;
      case "editor": {
        leaveAltScreen();
        showCursor();
        process.stdin.setRawMode(false);
        process.stdin.pause();
        const dir = await mkdtemp(join(tmpdir(), "voxiva-"));
        const path = join(dir, "prompt.md");
        await writeFile(path, state.input, "utf8");
        const configured = process.env.EDITOR?.trim();
        const command = configured || (process.platform === "win32" ? "notepad" : "vi");
        const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((part) => part.replace(/^"|"$/g, "")) ?? [command];
        spawnSync(parts[0], [...parts.slice(1), path], { stdio: "inherit" });
        state.input = (await readFile(path, "utf8")).trim();
        state.cursor = state.input.length;
        process.stdin.resume();
        process.stdin.setRawMode(true);
        process.stdout.write("\x1b[?2004h");
        enterAltScreen();
        hideCursor();
        toast("Prompt loaded from editor.", "ok");
        return;
      }
    }
  }

  async function applySlashResult(result: SlashResult) {
    switch (result.type) {
      case "exit":
        running = false;
        break;
      case "clear":
        await persistSession();
        state.messages = [];
        state.history = [{ role: "system", content: getPlan(state.plan).system }];
        state.sessionId = undefined;
        state.redoStack = [];
        state.scrollOffset = 0;
        toast("New session", "ok");
        break;
      case "toast":
        toast(result.message, result.tone ?? "info");
        break;
      case "overlay":
        state.overlay = result.mode;
        state.overlayIndex = 0;
        state.paletteFilter = "";
        break;
      case "help":
        state.overlay = "help";
        break;
      case "action":
        await runAction(result.action);
        break;
      case "continue":
        break;
    }
    queueRender();
  }

  async function drainPromptQueue() {
    if (state.busy || !state.promptQueue.length) return;
    const next = state.promptQueue.shift()!;
    state.input = next;
    state.cursor = next.length;
    await submitInput();
  }

  async function submitInput() {
    let line = state.input.trim();
    // Enter on incomplete `/…` runs the highlighted suggestion (Codex/Claude style)
    if (line.startsWith("/") && !line.includes(" ") && activeSuggestions().length) {
      const selected = activeSuggestions()[Math.min(state.suggestIndex, activeSuggestions().length - 1)];
      if (selected && selected.name !== line.slice(1).toLowerCase()) {
        line = `/${selected.name}`;
      }
    }
    state.input = "";
    state.cursor = 0;
    state.suggestIndex = 0;
    if (!line) return;

    if (state.busy && !line.startsWith("/") && !line.startsWith("!")) {
      state.promptQueue.push(line);
      toast(`${TIP_QUEUE_BUSY} (${state.promptQueue.length})`, "info");
      queueRender();
      return;
    }

    const slash = resolveSlash(line);
    if (slash) {
      const result = await slash.cmd.handler(slash.args, ctx);
      await applySlashResult(result);
      return;
    }
    if (line.startsWith("/")) {
      toast(`Unknown command: ${line.split(/\s/, 1)[0]}. Type /help.`, "error");
      return;
    }

    if (line.startsWith("!")) {
      if (state.busy) {
        toast("Wait for the current response to finish.", "info");
        return;
      }
      const command = line.slice(1).trim();
      if (!command) {
        toast("Type a shell command after !", "info");
        return;
      }
      state.messages.push({ role: "user", text: `!${command}` });
      try {
        const output = execSync(command, {
          cwd: state.cwd,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
          shell: process.platform === "win32" ? "powershell.exe" : "/bin/sh",
          timeout: 60_000,
        }).trim();
        const result = output || "(command completed without output)";
        state.messages.push({ role: "system", text: result });
        state.history.push({
          role: "user",
          content: `Shell command: ${command}\n\nOutput:\n${result}`,
        });
        await persistSession();
      } catch (error) {
        const result =
          error && typeof error === "object" && "stderr" in error
            ? String(error.stderr).trim()
            : error instanceof Error
              ? error.message
              : String(error);
        state.messages.push({ role: "system", text: result });
        toast("Shell command failed.", "error");
      }
      queueRender();
      return;
    }

    if (!state.model) {
      toast(
        state.authKeys.length === 0 ? TIP_NEED_CONNECT : TIP_NEED_MODEL,
        "info",
      );
      return;
    }

    state.messages.push({ role: "user", text: line });
    state.scrollOffset = 0;
    let prompt = line;
    const references = [...line.matchAll(/@(?:"([^"]+)"|([^\s]+))/g)];
    for (const match of references.slice(0, 8)) {
      const relative = (match[1] || match[2]).replace(/[),.;]+$/, "");
      const path = join(state.cwd, relative);
      try {
        const content = await readFile(path, "utf8");
        prompt += `\n\n<file path="${relative}">\n${content.slice(0, 100_000)}\n</file>`;
      } catch {
        toast(`Could not read @${relative}`, "error");
      }
    }
    state.history.push({ role: "user", content: prompt });
    const responseIndex = state.messages.length;
    state.messages.push({ role: "assistant", text: "" });
    state.busy = true;
    queueRender();

    let reply = "";
    streamAbort = new AbortController();
    try {
      const authNow = await loadAuth();
      reply = await streamChat(authNow, state.model, state.history, {
        signal: streamAbort.signal,
        onToken: (chunk) => {
          state.messages[responseIndex].text += chunk;
          queueRender();
        },
      });
      if (streamAbort.signal.aborted) {
        if (reply) state.history.push({ role: "assistant", content: reply });
        toast("Generation stopped.", "info");
      } else {
        state.messages[responseIndex].text = reply;
        state.history.push({ role: "assistant", content: reply });
        state.redoStack = [];
        await persistSession();
      }
    } catch (err) {
      if (streamAbort.signal.aborted) {
        toast("Generation stopped.", "info");
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        state.messages.splice(responseIndex, 1);
        state.messages.push({ role: "system", text: msg });
        state.history.pop();
        toast(msg, "error");
      }
    } finally {
      streamAbort = null;
      state.busy = false;
      queueRender(true);
      void drainPromptQueue();
    }
  }

  async function startConnectKey(id: ProviderId) {
    state.connectingProvider = id;
    state.authKeyInput = "";
    state.authKeyCursor = 0;
    const authNow = await loadAuth();
    const existing = authNow[id]?.apiKey?.trim();
    if (existing) {
      state.authKeyInput = existing;
      state.authKeyCursor = existing.length;
    }
    state.overlay = "connect-key";
    queueRender();
  }

  async function saveConnectKey() {
    const id = state.connectingProvider;
    if (!id) return;
    const key = state.authKeyInput.trim();
    if (!key) {
      toast("API key is required.", "error");
      return;
    }
    const authNow = await loadAuth();
    authNow[id] = { apiKey: key };
    await saveAuth(authNow);
    await ctx.refresh();
    if (state.pendingModel?.startsWith(`${id}/`)) {
      await ctx.setModel(state.pendingModel);
      state.pendingModel = undefined;
    }
    state.connectingProvider = null;
    state.authKeyInput = "";
    state.authKeyCursor = 0;
    state.overlay = null;
    state.overlayIndex = 0;
    toast(`${id} connected`, "ok");
    queueRender(true);
  }

  async function overlayEnter() {
    switch (state.overlay) {
      case "palette": {
        const q = state.paletteFilter.toLowerCase();
        const items = paletteItems().filter((c) => matchesPaletteFilter(c, q));
        const cmd = items[state.overlayIndex];
        if (!cmd) break;
        state.overlay = null;
        await applySlashResult(await cmd.handler("", ctx));
        break;
      }
      case "connect": {
        const p = PROVIDERS[state.overlayIndex];
        if (p) await startConnectKey(p.id);
        break;
      }
      case "models": {
        const m = listCatalog()[state.overlayIndex];
        if (m) {
          if (!state.authKeys.includes(m.provider)) {
            const providerIndex = PROVIDERS.findIndex((provider) => provider.id === m.provider);
            state.pendingModel = modelRef(m);
            state.overlay = "connect";
            state.overlayIndex = Math.max(0, providerIndex);
            toast(`Connect ${m.provider} before using this model.`, "info");
            break;
          }
          const ref = modelRef(m);
          await ctx.setModel(ref);
          await ctx.refresh();
          state.overlay = null;
          toast(`Model → ${ref}`, "ok");
        }
        break;
      }
      case "plans": {
        const p = PLANS[state.overlayIndex];
        if (p) {
          await ctx.setPlan(p.id);
          await ctx.refresh();
          state.overlay = null;
          toast(`Plan → ${p.id}`, "ok");
        }
        break;
      }
      case "themes": {
        const th = THEMES[state.overlayIndex];
        if (th) {
          await ctx.setTheme(th.id);
          state.overlay = null;
          toast(`Theme → ${th.label}`, "ok");
        }
        break;
      }
      case "sessions": {
        const selected = state.savedSessions[state.overlayIndex];
        if (!selected) break;
        const session = await getSession(selected.id);
        if (session) {
          state.sessionId = session.id;
          state.plan = session.plan;
          state.model = session.model;
          state.history = session.messages;
          state.messages = session.messages
            .filter((message) => message.role !== "system")
            .map((message) => ({
              role: message.role as "user" | "assistant",
              text: message.content,
            }));
          state.redoStack = [];
          state.scrollOffset = 0;
          await patchConfig({ plan: session.plan, defaultModel: session.model });
          await ctx.refresh();
          state.overlay = null;
          toast(`Resumed: ${session.title}`, "ok");
        }
        break;
      }
      default:
        state.overlay = null;
    }
    queueRender();
  }

  function overlayItemCount(): number {
    switch (state.overlay) {
      case "connect":
        return PROVIDERS.length;
      case "models":
        return listCatalog().length;
      case "plans":
        return PLANS.length;
      case "themes":
        return THEMES.length;
      case "sessions":
        return Math.min(10, state.savedSessions.length);
      case "palette": {
        const query = state.paletteFilter.toLowerCase();
        return paletteItems().filter((command) => matchesPaletteFilter(command, query)).length;
      }
      default:
        return 1;
    }
  }

  function cyclePlan() {
    const ids = PLANS.map((p) => p.id);
    const idx = ids.indexOf(state.plan);
    const next = ids[(idx + 1) % ids.length];
    void ctx.setPlan(next).then(async () => {
      await ctx.refresh();
      queueRender();
    });
  }

  if (snapshot) {
    draw();
    process.stdout.write("\n");
    return;
  }

  enterAltScreen();
  process.stdout.write("\x1b[?2004h");
  hideCursor();
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  function insertAtCursor(text: string) {
    const sanitized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (!sanitized) return;
    state.input = state.input.slice(0, state.cursor) + sanitized + state.input.slice(state.cursor);
    state.cursor += sanitized.length;
    state.suggestIndex = 0;
    queueRender();
  }

  function toggleVoice() {
    if (state.voice === "listen") {
      state.voice = "off";
      state.voiceDraft = "";
      setVoiceListening(false);
      toast(state.input.trim() ? "Voice session ended." : TIP_VOICE_READY, "ok");
      queueRender(true);
      return;
    }
    state.voice = "listen";
    state.voiceDraft = "";
    state.overlay = null;
    setVoiceListening(true);
    toast(TIP_VOICE_LISTEN, "info");
    queueRender(true);
  }

  function appendVoiceTranscript(chunk: string) {
    if (state.voice !== "listen" || !chunk) return;
    state.voiceDraft += chunk;
    insertAtCursor(chunk);
  }

  setVoiceSink(appendVoiceTranscript);
  setVoiceListening(false);
  draw();

  function insertAuthKeyAtCursor(text: string) {
    const sanitized = text.replace(/[\r\n]/g, "");
    state.authKeyInput =
      state.authKeyInput.slice(0, state.authKeyCursor) +
      sanitized +
      state.authKeyInput.slice(state.authKeyCursor);
    state.authKeyCursor += sanitized.length;
    queueRender();
  }

  const onData = (key: string) => {
    if (!running) return;

    if (state.overlay === "connect-key") {
      if (key === "\u001b") {
        state.overlay = "connect";
        state.connectingProvider = null;
        state.authKeyInput = "";
        state.authKeyCursor = 0;
        queueRender();
        return;
      }
      if (key === "\r" || key === "\n") {
        void saveConnectKey();
        return;
      }
      if (key === "\u007f" || key === "\b") {
        if (state.authKeyCursor > 0) {
          const previous = previousCodePointIndex(state.authKeyInput, state.authKeyCursor);
          state.authKeyInput =
            state.authKeyInput.slice(0, previous) + state.authKeyInput.slice(state.authKeyCursor);
          state.authKeyCursor = previous;
          queueRender();
        }
        return;
      }
      if (key === "\u001b[D") {
        state.authKeyCursor = previousCodePointIndex(state.authKeyInput, state.authKeyCursor);
        queueRender();
        return;
      }
      if (key === "\u001b[C") {
        state.authKeyCursor = nextCodePointIndex(state.authKeyInput, state.authKeyCursor);
        queueRender();
        return;
      }
      if (key.includes("\x1b[200~")) {
        inPaste = true;
        pasteBuffer = key.split("\x1b[200~").pop() ?? "";
        if (pasteBuffer.includes("\x1b[201~")) {
          const end = pasteBuffer.indexOf("\x1b[201~");
          insertAuthKeyAtCursor(pasteBuffer.slice(0, end));
          inPaste = false;
          pasteBuffer = "";
        }
        return;
      }
      if (inPaste) {
        pasteBuffer += key;
        const end = pasteBuffer.indexOf("\x1b[201~");
        if (end >= 0) {
          insertAuthKeyAtCursor(pasteBuffer.slice(0, end));
          inPaste = false;
          pasteBuffer = "";
        }
        return;
      }
      if (!key.startsWith("\u001b") && [...key].every((char) => char >= " ")) {
        insertAuthKeyAtCursor(key);
      }
      return;
    }

    if (state.overlay) {
      if (key === "\u001b") {
        state.overlay = null;
        queueRender();
        return;
      }
      if (state.overlay === "help" || state.overlay === "providers") {
        if (key === "\r" || key === "\n") {
          state.overlay = null;
          queueRender();
        }
        return;
      }
      if (key === "\r" || key === "\n") {
        void overlayEnter();
        return;
      }
      if (key === "\u001b[A" || key.toLowerCase() === "k") {
        state.overlayIndex = Math.max(0, state.overlayIndex - 1);
        queueRender();
        return;
      }
      if (key === "\u001b[B" || key.toLowerCase() === "j") {
        state.overlayIndex = Math.min(
          Math.max(0, overlayItemCount() - 1),
          state.overlayIndex + 1,
        );
        queueRender();
        return;
      }
      if (/^[1-9]$/.test(key) && state.overlay !== "palette") {
        const index = Number(key) - 1;
        if (index < overlayItemCount()) {
          state.overlayIndex = index;
          void overlayEnter();
        }
        return;
      }
      if (state.overlay === "palette" && key.length === 1 && key >= " ") {
        state.paletteFilter += key;
        state.overlayIndex = 0;
        clampOverlayIndex();
        queueRender();
        return;
      }
      if (state.overlay === "palette" && key === "\u007f") {
        state.paletteFilter = state.paletteFilter.slice(0, -1);
        clampOverlayIndex();
        queueRender();
        return;
      }
      return;
    }

    if (state.busy && (key === "\u001b" || key === "\u0003")) {
      streamAbort?.abort();
      state.busy = false;
      queueRender(true);
      return;
    }

    if (key.includes("\x1b[200~")) {
      inPaste = true;
      pasteBuffer = key.split("\x1b[200~").pop() ?? "";
      if (pasteBuffer.includes("\x1b[201~")) {
        const end = pasteBuffer.indexOf("\x1b[201~");
        insertAtCursor(pasteBuffer.slice(0, end));
        inPaste = false;
        pasteBuffer = "";
      }
      return;
    }
    if (inPaste) {
      pasteBuffer += key;
      const end = pasteBuffer.indexOf("\x1b[201~");
      if (end >= 0) {
        insertAtCursor(pasteBuffer.slice(0, end));
        inPaste = false;
        pasteBuffer = "";
      }
      return;
    }

    if (key === "\u0003") {
      running = false;
      return;
    }
    // Ctrl+R — Voxiva Voice listen toggle (Hold · Speak · Land into input)
    if (key === "\u0012") {
      toggleVoice();
      return;
    }
    if (key === "\u001b" && state.voice === "listen") {
      state.voice = "off";
      state.voiceDraft = "";
      toast("Voice cancelled.", "info");
      queueRender(true);
      return;
    }
    if (Date.now() < leaderUntil) {
      leaderUntil = 0;
      const commandByKey: Record<string, string> = {
        c: "compact",
        e: "editor",
        i: "init",
        l: "sessions",
        m: "models",
        n: "new",
        q: "exit",
        r: "redo",
        t: "themes",
        u: "undo",
        x: "export",
      };
      const commandName = commandByKey[key.toLowerCase()];
      const command = paletteItems().find((item) => item.name === commandName);
      if (command) void command.handler("", ctx).then(applySlashResult);
      return;
    }
    if (key === "\u0018") {
      leaderUntil = Date.now() + 2000;
      toast("ctrl+x  c/e/i/m/n/q/r/t/u/x", "info");
      queueRender();
      return;
    }
    if (key === "\u0010") {
      state.overlay = "palette";
      state.overlayIndex = 0;
      state.paletteFilter = "";
      queueRender();
      return;
    }
    if (key === "\t") {
      if (state.input.startsWith("/") && acceptSuggestion()) return;
      cyclePlan();
      return;
    }
    if (key === "\u001b[A") {
      const suggestions = activeSuggestions();
      if (suggestions.length) {
        state.suggestIndex = (state.suggestIndex - 1 + suggestions.length) % suggestions.length;
        queueRender();
        return;
      }
    }
    if (key === "\u001b[B") {
      const suggestions = activeSuggestions();
      if (suggestions.length) {
        state.suggestIndex = (state.suggestIndex + 1) % suggestions.length;
        queueRender();
        return;
      }
    }
    if (key === "\u001b[5~") {
      state.scrollOffset = Math.min(
        Math.max(0, state.messages.length * 3),
        state.scrollOffset + 5,
      );
      queueRender();
      return;
    }
    if (key === "\u001b[6~") {
      state.scrollOffset = Math.max(0, state.scrollOffset - 5);
      queueRender();
      return;
    }
    if (key === "\r" || key === "\n") {
      void submitInput();
      return;
    }
    if (key === "\u007f" || key === "\b") {
      if (state.cursor > 0) {
        const previous = previousCodePointIndex(state.input, state.cursor);
        state.input = state.input.slice(0, previous) + state.input.slice(state.cursor);
        state.cursor = previous;
        state.suggestIndex = 0;
        queueRender();
      }
      return;
    }
    if (key === "\u001b[D") {
      state.cursor = previousCodePointIndex(state.input, state.cursor);
      queueRender();
      return;
    }
    if (key === "\u001b[C") {
      state.cursor = nextCodePointIndex(state.input, state.cursor);
      queueRender();
      return;
    }
    if (!key.startsWith("\u001b") && [...key].every((char) => char >= " ")) {
      state.input = state.input.slice(0, state.cursor) + key + state.input.slice(state.cursor);
      state.cursor += key.length;
      state.suggestIndex = 0;
      queueRender();
    }
  };

  process.stdin.on("data", onData);
  process.stdout.on("resize", queueRender);

  await new Promise<void>((resolve) => {
    let blinkPhase = 0;
    const tick = setInterval(async () => {
      if (!running) {
        clearInterval(tick);
        process.stdin.off("data", onData);
        process.stdout.off("resize", queueRender);
        await persistSession();
        setVoiceSink(null);
        setVoiceListening(false);
        showCursor();
        process.stdin.setRawMode(false);
        leaveAltScreen();
        process.stdout.write("\x1b[?2004l");
        process.stdout.write(tc().muted("Bye.\n"));
        resolve();
        return;
      }
      blinkPhase += 1;
      // ~530ms soft caret blink so the composer always looks writable
      if (blinkPhase % 4 === 0 && !state.overlay) {
        state.caretBlink = !state.caretBlink;
        queueRender();
      }
      if (state.toast && state.toastUntil && Date.now() >= state.toastUntil) {
        state.toast = undefined;
        queueRender();
      }
    }, 130);
  });
}
