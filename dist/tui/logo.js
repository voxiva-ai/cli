import chalk from "chalk";
import { getTheme } from "./themes.js";
let active = getTheme("voxiva");
export function setActiveTheme(id) {
    active = getTheme(id);
}
export function getActiveTheme() {
    return active;
}
export function makeTc(theme = active) {
    return {
        text: chalk.hex(theme.text),
        muted: chalk.hex(theme.muted),
        dim: chalk.hex(theme.dim),
        accent: chalk.hex(theme.accent),
        accent2: chalk.hex(theme.accent2),
        border: chalk.hex(theme.border),
        ok: chalk.hex(theme.ok),
        danger: chalk.hex(theme.danger),
        tip: chalk.hex(theme.tip),
    };
}
export function tc() {
    return makeTc(active);
}
