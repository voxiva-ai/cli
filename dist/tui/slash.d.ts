import type { LocaleId, PlanId } from "../config/store.js";
export type SlashHandler = (args: string, ctx: SlashContext) => Promise<SlashResult>;
export type SlashResult = {
    type: "continue";
} | {
    type: "exit";
} | {
    type: "toast";
    message: string;
    tone?: "ok" | "error" | "info";
} | {
    type: "overlay";
    mode: OverlayMode;
} | {
    type: "clear";
} | {
    type: "help";
} | {
    type: "action";
    action: "compact" | "undo" | "redo" | "export" | "editor" | "init" | "details" | "thinking" | "voice" | "cost" | "diff" | "copy" | "stop" | "retry" | "reload" | "pwd" | "explain" | "review" | "test" | "fix" | "memory-add" | "memory-clear" | "queue-clear" | "continue" | "apply" | "reject" | "update";
    args?: string;
};
export type OverlayMode = "help" | "connect" | "models" | "plans" | "palette" | "providers" | "themes" | "sessions" | "connect-key" | "languages" | "files" | "context" | "shortcuts" | "settings" | "history" | "branch" | "queue" | "memory" | "workspaces" | "approve";
export type SlashContext = {
    cwd: string;
    plan: PlanId;
    model?: string;
    theme: import("../config/store.js").ThemeId;
    locale: LocaleId;
    setPlan: (id: PlanId) => Promise<void>;
    setModel: (ref: string) => Promise<void>;
    setTheme: (id: import("../config/store.js").ThemeId) => Promise<void>;
    setLocale: (id: LocaleId) => Promise<void>;
    refresh: () => Promise<void>;
};
export type SlashCommand = {
    name: string;
    aliases?: string[];
    description: string;
    keybind?: string;
    handler: SlashHandler;
};
export declare const SLASH_COMMANDS: SlashCommand[];
export declare function resolveSlash(input: string): {
    cmd: SlashCommand;
    args: string;
} | null;
export declare function paletteItems(): SlashCommand[];
export declare function matchesPaletteFilter(command: SlashCommand, query: string): boolean;
export declare function slashSuggestions(input: string): SlashCommand[];
/** Overlays that close on Enter without selection. */
export declare const INFO_OVERLAYS: OverlayMode[];
/** Overlays that accept type-to-filter via paletteFilter. */
export declare const FILTER_OVERLAYS: OverlayMode[];
