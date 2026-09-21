import stringWidth from "string-width";
import wrapAnsi from "wrap-ansi";
import sliceAnsi from "slice-ansi";
import chalk from "chalk";
import type { PlanId } from "../config/store.js";
import { tc } from "./logo.js";
import { PLAN_COLORS } from "./themes.js";

function c() {
  return tc();
}

export const CONTENT_WIDTH = 72;

export function fullWidth(cols: number): number {
  return Math.max(40, cols);
}

export function termSize(): { cols: number; rows: number } {
  return {
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  };
}

export function contentWidth(cols: number): number {
  return Math.max(40, Math.min(CONTENT_WIDTH, cols - 2));
}

export function contentIndent(cols: number, width?: number): string {
  const w = width ?? contentWidth(cols);
  return " ".repeat(Math.max(0, Math.floor((cols - w) / 2)));
}

export function padCenter(text: string, width: number): string {
  const w = stringWidth(text);
  if (w >= width) return text;
  const left = Math.max(0, Math.floor((width - w) / 2));
  return " ".repeat(left) + text;
}

export function centerBlock(lines: string[], cols: number): string[] {
  return lines.map((line) => padCenter(line, cols));
}

export function truncate(text: string, max: number): string {
  if (stringWidth(text) <= max) return text;
  return sliceAnsi(text, 0, Math.max(0, max - 1)) + "…";
}

export function wrapText(text: string, width: number): string[] {
  return wrapAnsi(text, Math.max(10, width), {
    hard: true,
    trim: false,
    wordWrap: true,
  }).split("\n");
}

export type InputBoxLayout = {
  lines: string[];
  boxLeft: number;
  inputRow: number;
  inputCol: number;
};

export type InputBarMode = "type" | "listen";

export type InputBarOptions = {
  /** Soft blink on — draw caret glyph; off — draw space. */
  blink?: boolean;
  /** type = normal compose; listen = Voxiva Voice capture. */
  mode?: InputBarMode;
  /** Dim ghost completion after the caret (e.g. unfinished slash command). */
  ghost?: string;
};

function clipToWidth(text: string, width: number): string {
  let output = "";
  for (const char of text) {
    if (stringWidth(output + char) > width) break;
    output += char;
  }
  return output;
}

/**
 * Full-width composer bar.
 * Draws a soft blinking caret so the field always reads as editable;
 * listen mode is the landing strip for Voxiva Voice transcripts.
 */
export function inputBar(
  cols: number,
  inputText: string,
  cursorIndex: number,
  placeholder: string,
  opts: InputBarOptions = {},
): InputBoxLayout {
  const mode = opts.mode ?? "type";
  const blinkOn = opts.blink !== false;
  const caret = blinkOn ? (mode === "listen" ? c().ok("▋") : c().accent("▋")) : " ";
  const w = fullWidth(cols);
  const prompt = mode === "listen" ? c().ok("●") : c().accent(">");
  const promptW = 1;
  // room for " " + caret + content
  const inner = w - 4;
  const boxLeft = 1;

  const safeCursor = Math.max(0, Math.min(cursorIndex, inputText.length));
  let viewportStart = 0;
  const usable = Math.max(1, inner - 2); // leave space for caret glyph
  while (
    viewportStart < safeCursor &&
    stringWidth(inputText.slice(viewportStart, safeCursor)) > usable - 1
  ) {
    const codePoint = inputText.codePointAt(viewportStart) ?? 0;
    viewportStart += codePoint > 0xffff ? 2 : 1;
  }

  const scrolled = viewportStart > 0;
  const marker = scrolled ? "…" : "";
  const before = inputText.slice(viewportStart, safeCursor);
  const afterRaw = inputText.slice(safeCursor);
  const beforeW = stringWidth(marker) + stringWidth(before);
  const afterBudget = Math.max(0, usable - beforeW);
  const after = clipToWidth(afterRaw, afterBudget);
  const ghostRaw = (opts.ghost ?? "").replace(/^\s+/, "");
  const ghostBudget = Math.max(0, afterBudget - stringWidth(after));
  const ghost = ghostRaw && !afterRaw ? clipToWidth(ghostRaw, ghostBudget) : "";

  let body: string;
  if (!inputText.length) {
    const ph = truncate(
      mode === "listen" ? "Listening…" : placeholder,
      Math.max(4, usable - 2),
    );
    body = ` ${caret} ${c().dim(ph)}`;
  } else {
    body = ` ${marker}${before}${caret}${after}${ghost ? c().dim(ghost) : ""}`;
  }

  const bodyW = stringWidth(body);
  const spacePad = Math.max(0, inner - bodyW);

  const edge = mode === "listen" ? c().ok : c().dim;
  const top = edge("┌" + "─".repeat(w - 2) + "┐");
  const row = edge("│") + prompt + body + " ".repeat(spacePad) + edge("│");
  const bottom = edge("└" + "─".repeat(w - 2) + "┘");

  return {
    lines: [top, row, bottom],
    boxLeft,
    inputRow: 1,
    inputCol: boxLeft + promptW + 1 + stringWidth(marker) + stringWidth(before),
  };
}

export function hintLine(parts: { key: string; label: string }[]): string {
  return parts
    .map((p) => `${c().muted(p.key)} ${c().dim(p.label)}`)
    .join(c().dim("    "));
}

export function tipLine(text: string): string {
  return `${c().tip("i")}  ${c().muted(text)}`;
}

export type HeaderInfo = {
  version: string;
  plan: string;
  planId: PlanId;
  model?: string;
  authKeys: string[];
  noModelLabel?: string;
  notConnectedLabel?: string;
};

/** Status header — title + one status line, no icons. */
export function renderHeader(info: HeaderInfo, cols: number): string[] {
  const t = c();
  const w = fullWidth(cols);
  const inner = w - 4;

  const noModel = info.noModelLabel ?? "no model";
  const notConnected = info.notConnectedLabel ?? "not connected";
  const modelVal = info.model ? t.text(info.model) : t.dim(noModel);
  const planVal = chalk.hex(PLAN_COLORS[info.planId])(info.plan);
  const authVal = info.authKeys.length
    ? t.muted(info.authKeys.join(", "))
    : t.dim(notConnected);

  const rows = [
    `${t.accent(">")} ${t.text("Voxiva CLI")} ${t.dim(`(v${info.version})`)}`,
    `${planVal}${t.dim(" · ")}${modelVal}${t.dim(" · ")}${authVal}`,
  ];

  const top = t.border("┌" + "─".repeat(w - 2) + "┐");
  const body = rows.map((line) => {
    const clipped = truncate(line, inner);
    return (
      t.border("│") +
      " " +
      clipped +
      " ".repeat(Math.max(0, inner + 1 - stringWidth(clipped))) +
      t.border("│")
    );
  });
  const bottom = t.border("└" + "─".repeat(w - 2) + "┘");
  return [top, ...body, bottom];
}

export type StatusFooterParts = {
  cwd: string;
  busy?: boolean;
  queued?: number;
  workingLabel?: string;
  queuedLabel?: string;
};

/** Footer — workspace path only. */
export function statusFooter(parts: StatusFooterParts, width: number): string {
  const t = c();
  const left = t.dim(truncate(parts.cwd, width - 16));
  const right = parts.busy
    ? parts.queued
      ? t.accent(parts.queuedLabel ?? `queued ${parts.queued}`)
      : t.accent(parts.workingLabel ?? "working…")
    : "";
  const gap = width - stringWidth(left) - stringWidth(right);
  return left + " ".repeat(Math.max(1, gap)) + right;
}

export function horizontalRule(width: number): string {
  return c().dim("─".repeat(width));
}

/** Aligned slash-command suggestions under the composer. */
export function suggestionRows(
  items: { name: string; description: string; selected?: boolean }[],
  cols: number,
  hint?: string,
): string[] {
  if (!items.length) return [];
  const w = fullWidth(cols);
  const inner = w - 4;
  const out: string[] = [];
  const t = c();
  const namePad = Math.min(16, Math.max(10, ...items.map((i) => i.name.length + 1)));

  for (const item of items) {
    const mark = item.selected ? t.accent("›") : t.dim("·");
    const name = `/${item.name}`.padEnd(namePad);
    const line = `${mark} ${item.selected ? t.accent(name) : t.muted(name)} ${t.dim(item.description)}`;
    out.push(truncate(line, inner));
  }
  if (hint) out.push(t.dim(truncate(hint, inner)));
  return out;
}

/** Full-width overlay panel. */
export function panel(lines: string[], cols: number): string[] {
  const width = Math.max(40, fullWidth(cols) - 2);
  const top = c().border("┌" + "─".repeat(width) + "┐");
  const bottom = c().border("└" + "─".repeat(width) + "┘");
  const body = lines.map((line) => {
    const clipped = truncate(line, width - 2);
    return (
      c().border("│") +
      " " +
      clipped +
      " ".repeat(Math.max(0, width - 2 - stringWidth(clipped))) +
      " " +
      c().border("│")
    );
  });
  return [top, ...body, bottom];
}

export function clearScreen(): void {
  process.stdout.write("\x1b[2J\x1b[H");
}

export function enterAltScreen(): void {
  process.stdout.write("\x1b[?1049h\x1b[H");
}

export function leaveAltScreen(): void {
  process.stdout.write("\x1b[?1049l");
}

export function paintFrame(lines: string[], cols: number): void {
  const frame = lines.map((line) => {
    const lineWidth = stringWidth(line);
    return line + " ".repeat(Math.max(0, cols - lineWidth));
  });
  process.stdout.write("\x1b[H" + frame.join("\n"));
}

export function hideCursor(): void {
  process.stdout.write("\x1b[?25l");
}

export function showCursor(): void {
  process.stdout.write("\x1b[?25h");
}

export function userBubble(text: string): string {
  return c().accent("› ") + c().text(text);
}

export function assistantBubble(text: string): string {
  return c().dim("  ") + c().muted(text);
}

export function systemNote(text: string): string {
  return c().accent(text);
}

export function errorNote(text: string): string {
  return c().danger(text);
}

export function okNote(text: string): string {
  return c().ok(text);
}

export type FrameLayout = {
  lines: string[];
  inputRow: number;
  inputCol: number;
};

/**
 * Compose frame: body (centered or top), pinned input near bottom, footer at very bottom.
 */
export function composeFrame(
  content: string[],
  cols: number,
  rows: number,
  pinned: string[],
  footer: string[],
  cursor: { inputRow: number; inputCol: number },
  align: "top" | "center" = "top",
): FrameLayout {
  const footerH = footer.length;
  const pinnedH = pinned.length;
  const availableBody = Math.max(0, rows - footerH - pinnedH);
  const bodyH = content.length;
  const overflowing = bodyH > availableBody;
  const cropStart = overflowing ? bodyH - availableBody : 0;
  const visibleContent = overflowing ? content.slice(cropStart) : content;
  const topPad = overflowing
    ? 0
    : align === "center"
      ? Math.max(1, Math.floor((availableBody - bodyH) / 2))
      : 0;

  const lines: string[] = [];
  for (let i = 0; i < topPad; i++) lines.push("");
  lines.push(...visibleContent);
  while (lines.length < availableBody) lines.push("");
  lines.push(...pinned);
  lines.push(...footer);

  return {
    lines,
    inputRow: availableBody + cursor.inputRow + 1,
    inputCol: cursor.inputCol + 1,
  };
}

/** @deprecated use inputBar */
export const INPUT_BOX_WIDTH = CONTENT_WIDTH;
export function inputBox(
  cols: number,
  inputText: string,
  cursorIndex: number,
  placeholder: string,
  _metaLine?: string,
  _align?: "left" | "center",
  opts?: InputBarOptions,
): InputBoxLayout {
  return inputBar(cols, inputText, cursorIndex, placeholder, opts);
}

/** @deprecated use renderHeader */
export function renderBadge(
  _name: string,
  version: string,
  planId: PlanId,
  cols: number,
): string[] {
  return renderHeader({ version, plan: planId, planId, authKeys: [] }, cols);
}

/** @deprecated use statusFooter */
export function statusBar(
  parts: { cwd: string; busy?: boolean; queued?: number },
  width: number,
): string {
  return statusFooter(parts, width);
}

export { tc };
