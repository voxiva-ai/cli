import type { PlanId, ThemeId } from "../config/store.js";
export type { ThemeId } from "../config/store.js";

/** Plan accent colors — consistent across all themes. */
export const PLAN_COLORS: Record<PlanId, string> = {
  build: "#5aa6ff",
  ship: "#c792ea",
  check: "#3fd49a",
  explore: "#7ad7ff",
};

export type TuiTheme = {
  id: ThemeId;
  label: string;
  text: string;
  muted: string;
  dim: string;
  accent: string;
  accent2: string;
  border: string;
  ok: string;
  danger: string;
  tip: string;
};

export const THEMES: readonly TuiTheme[] = [
  {
    id: "voxiva",
    label: "Voxiva Blue",
    text: "#e8ecf4",
    muted: "#7a8498",
    dim: "#4e5868",
    accent: "#5aa6ff",
    accent2: "#8ec0ff",
    border: "#2a3548",
    ok: "#3fd49a",
    danger: "#ff7b7b",
    tip: "#8ec0ff",
  },
  {
    id: "slate",
    label: "Slate",
    text: "#e4e8ee",
    muted: "#8a93a3",
    dim: "#5c6575",
    accent: "#9aa8bc",
    accent2: "#c5ced9",
    border: "#3a4250",
    ok: "#6ecf9a",
    danger: "#e88a8a",
    tip: "#b8c4d4",
  },
  {
    id: "midnight",
    label: "Midnight",
    text: "#dde4f0",
    muted: "#6a7590",
    dim: "#3d4658",
    accent: "#4d8fff",
    accent2: "#6aa8ff",
    border: "#1a2233",
    ok: "#34d399",
    danger: "#f87171",
    tip: "#6aa8ff",
  },
  {
    id: "arctic",
    label: "Arctic",
    text: "#f0f6ff",
    muted: "#94a8c4",
    dim: "#5e7494",
    accent: "#7ad7ff",
    accent2: "#b8ecff",
    border: "#2e4a66",
    ok: "#5eead4",
    danger: "#fca5a5",
    tip: "#b8ecff",
  },
  {
    id: "ember",
    label: "Ember",
    text: "#f3ebe4",
    muted: "#a08978",
    dim: "#6b5548",
    accent: "#e8915a",
    accent2: "#f0b080",
    border: "#3d2e28",
    ok: "#8bc48a",
    danger: "#e07a7a",
    tip: "#f0b080",
  },
  {
    id: "forest",
    label: "Forest",
    text: "#e6f0ea",
    muted: "#7a9485",
    dim: "#4a6356",
    accent: "#5fb87a",
    accent2: "#8fd4a4",
    border: "#2a3d32",
    ok: "#6ecf9a",
    danger: "#d97878",
    tip: "#8fd4a4",
  },
  {
    id: "mono",
    label: "Mono",
    text: "#ececec",
    muted: "#8a8a8a",
    dim: "#555555",
    accent: "#c8c8c8",
    accent2: "#e0e0e0",
    border: "#3a3a3a",
    ok: "#a8a8a8",
    danger: "#c0c0c0",
    tip: "#b0b0b0",
  },
] as const;

export function getTheme(id: ThemeId): TuiTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function themeIds(): ThemeId[] {
  return THEMES.map((t) => t.id);
}
