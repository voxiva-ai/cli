const assert = require("node:assert/strict");
const test = require("node:test");
const { createAppActions } = require("../app-actions.cjs");

test("preferences validate and persist themes and locales", async () => {
  let saved = { theme: "auto", locale: "en" };
  const app = createAppActions({ config: { loadConfig: async () => saved, patchConfig: async (patch) => (saved = { ...saved, ...patch }) }, themes: ["auto", "voxiva", "forest"], locales: ["en", "ru"], getStatus: async () => ({}) });
  assert.deepEqual(await app.preferences(), saved);
  assert.deepEqual(await app.setPreferences({ theme: "forest", locale: "ru" }), { theme: "forest", locale: "ru" });
  await assert.rejects(app.setPreferences({ theme: "nope" }), /theme/i);
  await assert.rejects(app.setPreferences({ locale: "fr" }), /locale/i);
  assert.deepEqual(saved, { theme: "forest", locale: "ru" });
});

test("doctor reports structured safe diagnostics", async () => {
  const app = createAppActions({ config: { loadConfig: async () => ({ theme: "auto", locale: "en" }) }, themes: ["auto"], locales: ["en"], getStatus: async () => ({ model: "deepseek/reasoner", providers: ["deepseek"], project: "C:/work", update: "unknown" }) });
  assert.deepEqual(await app.doctor(), { runtime: process.versions.node, model: "deepseek/reasoner", providers: ["deepseek"], project: "C:/work", update: "unknown" });
});

test("command palette exposes supported common app actions", () => {
  const app = createAppActions({ config: {}, themes: [], locales: [], getStatus: async () => ({}) });
  assert.deepEqual(app.commands().map(({ id }) => id), ["new", "models", "plans", "connect", "sessions", "workspaces", "doctor", "update"]);
  assert.equal(app.commands().some((item) => typeof item.label !== "string" || !item.label), false);
});
