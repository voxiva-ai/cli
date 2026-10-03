import type { PlanId } from "../config/store.js";
import { tc } from "./logo.js";
export declare const CONTENT_WIDTH = 72;
export declare function fullWidth(cols: number): number;
export declare function termSize(): {
    cols: number;
    rows: number;
};
export declare function contentWidth(cols: number): number;
export declare function contentIndent(cols: number, width?: number): string;
export declare function padCenter(text: string, width: number): string;
export declare function centerBlock(lines: string[], cols: number): string[];
export declare function truncate(text: string, max: number): string;
export declare function wrapText(text: string, width: number): string[];
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
/**
 * Full-width composer bar.
 * Draws a soft blinking caret so the field always reads as editable;
 * listen mode is the landing strip for Voxiva Voice transcripts.
 */
export declare function inputBar(cols: number, inputText: string, cursorIndex: number, placeholder: string, opts?: InputBarOptions): InputBoxLayout;
export declare function hintLine(parts: {
    key: string;
    label: string;
}[]): string;
export declare function tipLine(text: string): string;
export type HeaderInfo = {
    version: string;
    plan: string;
    planId: PlanId;
    model?: string;
    directory: string;
    updateBanner?: string;
    tip?: string;
    noModelLabel?: string;
};
/**
 * Compact Voxiva header (Codex layout, own voice):
 *   › Voxiva CLI (v0.1.0)
 *   model · …     /model to change
 *   plan  · …     Tab to switch
 *   dir   · ~
 */
export declare function renderHeader(info: HeaderInfo, cols: number): string[];
export type StatusFooterParts = {
    cwd: string;
    model?: string;
    busy?: boolean;
    queued?: number;
    workingLabel?: string;
    queuedLabel?: string;
};
/** Footer — model · directory. */
export declare function statusFooter(parts: StatusFooterParts, width: number): string;
export declare function horizontalRule(width: number): string;
/** Aligned slash-command suggestions under the composer. */
export declare function suggestionRows(items: {
    name: string;
    description: string;
    selected?: boolean;
}[], cols: number, hint?: string): string[];
/** Full-width overlay panel. */
export declare function panel(lines: string[], cols: number): string[];
export declare function clearScreen(): void;
export declare function paintFrame(lines: string[], cols: number): void;
export declare function hideCursor(): void;
export declare function showCursor(): void;
export declare function enterAltScreen(): void;
export declare function leaveAltScreen(): void;
export declare function userBubble(text: string): string;
export declare function assistantBubble(text: string): string;
export declare function systemNote(text: string): string;
export declare function errorNote(text: string): string;
export declare function okNote(text: string): string;
/** Compact attachment chip in chat. */
export declare function attachmentChip(kind: "image" | "file" | "paste", label: string, detail?: string): string;
/** Multi-line paste preview card for chat history. */
export declare function pasteCard(text: string, width: number, detail?: string): string[];
/** Image / file card in chat. */
export declare function mediaCard(kind: "image" | "file", label: string, detail?: string): string;
/** Compact file-change card for chat. */
export declare function fileChangeCard(path: string, kind: "create" | "update" | "pending" | "applied" | "skipped", detail?: string): string;
export type FrameLayout = {
    lines: string[];
    inputRow: number;
    inputCol: number;
};
/**
 * Compose frame: body (centered or top), pinned input near bottom, footer at very bottom.
 */
export declare function composeFrame(content: string[], cols: number, rows: number, pinned: string[], footer: string[], cursor: {
    inputRow: number;
    inputCol: number;
}, align?: "top" | "center"): FrameLayout;
/** @deprecated use inputBar */
export declare const INPUT_BOX_WIDTH = 72;
export declare function inputBox(cols: number, inputText: string, cursorIndex: number, placeholder: string, _metaLine?: string, _align?: "left" | "center", opts?: InputBarOptions): InputBoxLayout;
/** @deprecated use renderHeader */
export declare function renderBadge(_name: string, version: string, planId: PlanId, cols: number): string[];
/** @deprecated use statusFooter */
export declare function statusBar(parts: {
    cwd: string;
    busy?: boolean;
    queued?: number;
}, width: number): string;
export { tc };
