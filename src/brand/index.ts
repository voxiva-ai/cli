import chalk from "chalk";

/** Official Voxiva Space theme tokens (catalog.generated.ts). */
export const palette = {
  bg: "#07090e",
  bgRaised: "#0c1119",
  text: "#eef2f8",
  muted: "#8a93a8",
  accent: "#5aa6ff",
  accent2: "#7ad7ff",
  gold: "#7ad7ff",
  ok: "#3fd49a",
  danger: "#ff7b7b",
  violet: "#c792ea",
} as const;

export const c = {
  brand: chalk.hex(palette.accent),
  brand2: chalk.hex(palette.accent2),
  gold: chalk.hex(palette.gold),
  text: chalk.hex(palette.text),
  muted: chalk.hex(palette.muted),
  ok: chalk.hex(palette.ok),
  danger: chalk.hex(palette.danger),
  violet: chalk.hex(palette.violet),
  dim: chalk.hex(palette.muted),
  bold: chalk.bold,
};

/** Minimal text-only identity for non-TUI commands. */
export function vMark(_compact = false): string {
  return c.bold(c.brand("Voxiva CLI"));
}

export function wordmark(): string {
  return c.bold(c.brand("vox")) + c.bold(c.brand2("iva"));
}

export function promptGlyph(): string {
  return c.brand("›");
}

export function statusLine(parts: string[]): string {
  return parts.map((p, i) => (i === 0 ? c.brand(p) : c.muted(p))).join(c.muted(" · "));
}
