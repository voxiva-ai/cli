import type { LocaleId, PlanId } from "../config/store.js";
import { PLANS } from "../plans/index.js";
import { parseModelRef } from "../providers/chat.js";
import { getLocale, localeIds } from "../i18n/index.js";

export type SlashHandler = (args: string, ctx: SlashContext) => Promise<SlashResult>;

export type SlashResult =
  | { type: "continue" }
  | { type: "exit" }
  | { type: "toast"; message: string; tone?: "ok" | "error" | "info" }
  | { type: "overlay"; mode: OverlayMode }
  | { type: "clear" }
  | { type: "help" }
  | {
      type: "action";
      action:
        | "compact"
        | "undo"
        | "redo"
        | "export"
        | "editor"
        | "init"
        | "details"
        | "thinking"
        | "voice";
    };

export type OverlayMode =
  | "help"
  | "connect"
  | "models"
  | "plans"
  | "palette"
  | "providers"
  | "themes"
  | "sessions"
  | "connect-key"
  | "languages";

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

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "help",
    description: "Commands and shortcuts",
    keybind: "ctrl+p",
    handler: async () => ({ type: "help" }),
  },
  {
    name: "connect",
    aliases: ["auth"],
    description: "Add provider API key",
    handler: async () => ({ type: "overlay", mode: "connect" }),
  },
  {
    name: "models",
    description: "Pick a model",
    keybind: "ctrl+x m",
    handler: async () => ({ type: "overlay", mode: "models" }),
  },
  {
    name: "model",
    description: "Set model — /model openai/gpt-4.1-mini",
    handler: async (args, ctx) => {
      const ref = args.trim();
      if (!ref) return { type: "overlay", mode: "models" };
      if (!parseModelRef(ref)) {
        return { type: "toast", message: "Use provider/model, e.g. openai/gpt-4.1-mini", tone: "error" };
      }
      await ctx.setModel(ref);
      await ctx.refresh();
      return { type: "toast", message: `Model → ${ref}`, tone: "ok" };
    },
  },
  {
    name: "plans",
    aliases: ["plan"],
    description: "build · ship · check · explore",
    handler: async (args, ctx) => {
      const id = args.trim() as PlanId;
      if (!id) return { type: "overlay", mode: "plans" };
      if (!PLANS.some((p) => p.id === id)) {
        return { type: "toast", message: "Unknown plan. Try build, ship, check, explore.", tone: "error" };
      }
      await ctx.setPlan(id);
      await ctx.refresh();
      return { type: "toast", message: `Plan → ${id}`, tone: "ok" };
    },
  },
  {
    name: "lang",
    aliases: ["language", "locale"],
    description: "UI + reply language",
    handler: async (args, ctx) => {
      const id = args.trim().toLowerCase() as LocaleId;
      if (!id) return { type: "overlay", mode: "languages" };
      if (!localeIds().includes(id)) {
        return {
          type: "toast",
          message: `Unknown language. Try: ${localeIds().join(", ")}`,
          tone: "error",
        };
      }
      await ctx.setLocale(id);
      await ctx.refresh();
      const locale = getLocale(id);
      return { type: "toast", message: `Language → ${locale.native}`, tone: "ok" };
    },
  },
  {
    name: "new",
    aliases: ["clear"],
    description: "New session",
    keybind: "ctrl+x n",
    handler: async () => ({ type: "clear" }),
  },
  {
    name: "sessions",
    aliases: ["resume"],
    description: "Resume a saved session",
    keybind: "ctrl+x l",
    handler: async () => ({ type: "overlay", mode: "sessions" }),
  },
  {
    name: "compact",
    aliases: ["summarize"],
    description: "Compact history",
    keybind: "ctrl+x c",
    handler: async () => ({ type: "action", action: "compact" }),
  },
  {
    name: "undo",
    description: "Undo last turn",
    keybind: "ctrl+x u",
    handler: async () => ({ type: "action", action: "undo" }),
  },
  {
    name: "redo",
    description: "Redo last undo",
    keybind: "ctrl+x r",
    handler: async () => ({ type: "action", action: "redo" }),
  },
  {
    name: "export",
    description: "Export to Markdown",
    keybind: "ctrl+x x",
    handler: async () => ({ type: "action", action: "export" }),
  },
  {
    name: "editor",
    description: "Open external editor",
    keybind: "ctrl+x e",
    handler: async () => ({ type: "action", action: "editor" }),
  },
  {
    name: "init",
    description: "Create AGENTS.md",
    keybind: "ctrl+x i",
    handler: async () => ({ type: "action", action: "init" }),
  },
  {
    name: "details",
    description: "Toggle request details",
    handler: async () => ({ type: "action", action: "details" }),
  },
  {
    name: "thinking",
    description: "Toggle thinking status",
    handler: async () => ({ type: "action", action: "thinking" }),
  },
  {
    name: "voice",
    aliases: ["mic", "speak"],
    description: "Voice into input",
    keybind: "ctrl+r",
    handler: async () => ({ type: "action", action: "voice" }),
  },
  {
    name: "themes",
    aliases: ["theme"],
    description: "Color theme",
    keybind: "ctrl+x t",
    handler: async (args, ctx) => {
      const id = args.trim() as import("../config/store.js").ThemeId;
      if (!id) return { type: "overlay", mode: "themes" };
      const known = ["voxiva", "slate", "midnight", "arctic"] as const;
      if (!known.includes(id as (typeof known)[number])) {
        return { type: "toast", message: "Try voxiva, slate, midnight, arctic.", tone: "error" };
      }
      await ctx.setTheme(id);
      await ctx.refresh();
      return { type: "toast", message: `Theme → ${id}`, tone: "ok" };
    },
  },
  {
    name: "doctor",
    aliases: ["status"],
    description: "Runtime status",
    handler: async () => ({ type: "overlay", mode: "providers" }),
  },
  {
    name: "exit",
    aliases: ["quit", "q"],
    description: "Quit",
    keybind: "ctrl+x q",
    handler: async () => ({ type: "exit" }),
  },
];

const byName = new Map<string, SlashCommand>();
for (const cmd of SLASH_COMMANDS) {
  byName.set(cmd.name, cmd);
  for (const alias of cmd.aliases ?? []) byName.set(alias, cmd);
}

export function resolveSlash(input: string): { cmd: SlashCommand; args: string } | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return null;
  const body = trimmed.slice(1);
  const space = body.indexOf(" ");
  const name = (space === -1 ? body : body.slice(0, space)).toLowerCase();
  const args = space === -1 ? "" : body.slice(space + 1);
  if (!name) return null;

  const exact = byName.get(name);
  if (exact) return { cmd: exact, args };

  // Unique prefix — so `/con` + Enter runs /connect
  const prefixHits = SLASH_COMMANDS.filter((command) => {
    if (command.name.startsWith(name)) return true;
    return command.aliases?.some((alias) => alias.startsWith(name)) === true;
  });
  if (prefixHits.length === 1) return { cmd: prefixHits[0], args };
  return null;
}

export function paletteItems(): SlashCommand[] {
  return SLASH_COMMANDS;
}

export function matchesPaletteFilter(command: SlashCommand, query: string): boolean {
  const q = query.toLowerCase();
  if (!q) return true;
  return (
    command.name.includes(q) ||
    command.description.toLowerCase().includes(q) ||
    command.aliases?.some((alias) => alias.includes(q)) === true
  );
}

export function slashSuggestions(input: string): SlashCommand[] {
  if (!input.startsWith("/")) return [];
  const query = input.slice(1).toLowerCase().split(/\s/, 1)[0];
  const scored = SLASH_COMMANDS.map((command) => {
    const names = [command.name, ...(command.aliases ?? [])];
    let score = -1;
    for (const name of names) {
      if (name === query) score = Math.max(score, 300);
      else if (name.startsWith(query)) score = Math.max(score, 200 - (name.length - query.length));
      else if (query && name.includes(query)) score = Math.max(score, 100 - name.indexOf(query));
    }
    return { command, score };
  })
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score || a.command.name.localeCompare(b.command.name));
  return scored.map((row) => row.command).slice(0, 6);
}
