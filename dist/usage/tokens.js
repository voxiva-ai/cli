import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { configDir, ensureDir } from "../config/store.js";
/** Rough token estimate — good enough for /usage until providers return usage. */
export function estimateTokens(text) {
    if (!text)
        return 0;
    return Math.max(1, Math.ceil(text.length / 4));
}
export function estimateMessagesTokens(messages) {
    return messages.reduce((sum, message) => sum + estimateTokens(message.content), 0);
}
export function emptyUsage() {
    return { inputTokens: 0, outputTokens: 0, turns: 0 };
}
export function formatUsage(usage) {
    const total = usage.inputTokens + usage.outputTokens;
    return `${total.toLocaleString()} tokens (~${usage.inputTokens.toLocaleString()} in / ${usage.outputTokens.toLocaleString()} out, ${usage.turns} turns)`;
}
const LEDGER_PATH = join(configDir(), "usage.json");
function todayKey(d = new Date()) {
    return d.toISOString().slice(0, 10);
}
function emptyDay(date) {
    return { date, inputTokens: 0, outputTokens: 0, turns: 0, byModel: {} };
}
export async function loadLedger() {
    try {
        const raw = await readFile(LEDGER_PATH, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed?.version === 1 && parsed.days)
            return parsed;
    }
    catch {
        // fresh
    }
    return { version: 1, days: {} };
}
async function saveLedger(ledger) {
    await ensureDir();
    await writeFile(LEDGER_PATH, JSON.stringify(ledger, null, 2) + "\n", "utf8");
}
/** Persist a completed turn into today's ledger (and keep last 60 days). */
export async function recordTurnUsage(opts) {
    const ledger = await loadLedger();
    const date = todayKey();
    const day = ledger.days[date] ?? emptyDay(date);
    day.inputTokens += Math.max(0, opts.inputTokens);
    day.outputTokens += Math.max(0, opts.outputTokens);
    day.turns += 1;
    const model = opts.model?.trim() || "unknown";
    const bucket = day.byModel[model] ?? { inputTokens: 0, outputTokens: 0, turns: 0 };
    bucket.inputTokens += Math.max(0, opts.inputTokens);
    bucket.outputTokens += Math.max(0, opts.outputTokens);
    bucket.turns += 1;
    day.byModel[model] = bucket;
    ledger.days[date] = day;
    // Prune old days
    const keys = Object.keys(ledger.days).sort();
    while (keys.length > 60) {
        const old = keys.shift();
        if (old)
            delete ledger.days[old];
    }
    await saveLedger(ledger);
    return day;
}
export async function todayUsage() {
    const ledger = await loadLedger();
    const date = todayKey();
    return ledger.days[date] ?? emptyDay(date);
}
export function dayTotal(day) {
    return day.inputTokens + day.outputTokens;
}
/** Pretty multi-line panel for the /usage overlay (scrollable). */
export function usagePanelLines(opts) {
    const sessionTotal = opts.session.inputTokens + opts.session.outputTokens;
    const todayTotal = dayTotal(opts.today);
    const modelRows = Object.entries(opts.today.byModel)
        .map(([id, u]) => ({
        id,
        total: u.inputTokens + u.outputTokens,
        turns: u.turns,
    }))
        .sort((a, b) => b.total - a.total);
    const lines = [
        "Usage",
        "",
        "── Session ─────────────────────────────",
        `  Tokens     ${sessionTotal.toLocaleString()}`,
        `  In / Out   ${opts.session.inputTokens.toLocaleString()} / ${opts.session.outputTokens.toLocaleString()}`,
        `  Turns      ${opts.session.turns}`,
        `  Context    ~${opts.contextTokens.toLocaleString()} tok now`,
        "",
        "── Today ───────────────────────────────",
        `  Date       ${opts.today.date}`,
        `  Tokens     ${todayTotal.toLocaleString()}`,
        `  In / Out   ${opts.today.inputTokens.toLocaleString()} / ${opts.today.outputTokens.toLocaleString()}`,
        `  Turns      ${opts.today.turns}`,
        "",
        "── Now ─────────────────────────────────",
        `  Model      ${opts.model ?? "—"}`,
        `  Plan       ${opts.plan ?? "—"}`,
        `  Path       ${opts.cwd ?? "—"}`,
        `  Billing    ${opts.free ? "free path · $0" : "API key · your provider bills"}`,
        `  Locale     ${opts.locale ?? "en"}`,
    ];
    if (modelRows.length) {
        lines.push("", "── Models today ────────────────────────");
        for (const row of modelRows.slice(0, 12)) {
            const short = row.id.length > 36 ? `${row.id.slice(0, 34)}…` : row.id;
            lines.push(`  ${short.padEnd(38)} ${row.total.toLocaleString().padStart(8)}  (${row.turns}t)`);
        }
    }
    lines.push("", "Estimates from text length until providers return exact usage.", "Free OpenCode-style models do not bill through Voxiva.", "", "↑↓ scroll · enter/esc close · /model · /files");
    return lines;
}
