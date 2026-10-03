import type { PlanId, ThemeId } from "../config/store.js";
export type { ThemeId } from "../config/store.js";
/** Plan accent colors — consistent across all themes. */
export declare const PLAN_COLORS: Record<PlanId, string>;
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
export declare const THEMES: readonly TuiTheme[];
export declare function getTheme(id: ThemeId): TuiTheme;
export declare function themeIds(): ThemeId[];
