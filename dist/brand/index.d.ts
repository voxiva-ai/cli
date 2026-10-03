/** Official Voxiva Space theme tokens (catalog.generated.ts). */
export declare const palette: {
    readonly bg: "#07090e";
    readonly bgRaised: "#0c1119";
    readonly text: "#eef2f8";
    readonly muted: "#8a93a8";
    readonly accent: "#5aa6ff";
    readonly accent2: "#7ad7ff";
    readonly gold: "#7ad7ff";
    readonly ok: "#3fd49a";
    readonly danger: "#ff7b7b";
    readonly violet: "#c792ea";
};
export declare const c: {
    brand: import("chalk").ChalkInstance;
    brand2: import("chalk").ChalkInstance;
    gold: import("chalk").ChalkInstance;
    text: import("chalk").ChalkInstance;
    muted: import("chalk").ChalkInstance;
    ok: import("chalk").ChalkInstance;
    danger: import("chalk").ChalkInstance;
    violet: import("chalk").ChalkInstance;
    dim: import("chalk").ChalkInstance;
    bold: import("chalk").ChalkInstance;
};
/** Minimal text-only identity for non-TUI commands. */
export declare function vMark(_compact?: boolean): string;
export declare function wordmark(): string;
export declare function promptGlyph(): string;
export declare function statusLine(parts: string[]): string;
