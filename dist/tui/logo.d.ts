import { type ThemeId, type TuiTheme } from "./themes.js";
export declare function setActiveTheme(id: ThemeId): void;
export declare function getActiveTheme(): TuiTheme;
export declare function makeTc(theme?: TuiTheme): {
    text: import("chalk").ChalkInstance;
    muted: import("chalk").ChalkInstance;
    dim: import("chalk").ChalkInstance;
    accent: import("chalk").ChalkInstance;
    accent2: import("chalk").ChalkInstance;
    border: import("chalk").ChalkInstance;
    ok: import("chalk").ChalkInstance;
    danger: import("chalk").ChalkInstance;
    tip: import("chalk").ChalkInstance;
};
export declare function tc(): {
    text: import("chalk").ChalkInstance;
    muted: import("chalk").ChalkInstance;
    dim: import("chalk").ChalkInstance;
    accent: import("chalk").ChalkInstance;
    accent2: import("chalk").ChalkInstance;
    border: import("chalk").ChalkInstance;
    ok: import("chalk").ChalkInstance;
    danger: import("chalk").ChalkInstance;
    tip: import("chalk").ChalkInstance;
};
