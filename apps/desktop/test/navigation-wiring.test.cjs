const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("renderer DOM lookups only target elements present in the desktop shell", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const renderer = fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8");
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  assert.equal([...html.matchAll(/\bid="welcome"/g)].length, 1);
  const missing = [...new Set([...renderer.matchAll(/\$\("([^"]+)"\)/g)].map((match) => match[1]).filter((id) => !ids.has(id)))];

  assert.deepEqual(missing, []);
});

test("every application-menu item is wired to an action", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const renderer = fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8");
  const actions = [...html.matchAll(/data-action="([^"]+)"/g)].map((match) => match[1]);

  assert.ok(actions.length > 0);
  for (const action of actions) assert.ok(renderer.includes(`"${action}"`), `menu action is not handled: ${action}`);
});

test("workspace switching drains an active chat before replacing its DOM", () => {
  const renderer = fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8");
  const start = renderer.indexOf("async function createProjectWorktree");
  const end = renderer.indexOf("async function chooseProject", start);
  const handler = renderer.slice(start, end);

  const stop = handler.indexOf("await stopCurrentResponse()");
  const create = handler.indexOf("window.voxiva.createWorktree");
  assert.ok(stop >= 0 && stop < create);
});

test("a reply only converts the current draft tab", () => {
  const renderer = fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8");
  const start = renderer.indexOf("window.voxiva.onReply");
  const end = renderer.indexOf("window.voxiva.onChunk", start);
  const handler = renderer.slice(start, end);

  assert.match(handler, /if \(currentDraft\) \{[\s\S]*?const draft = openTabs\.find\(\(tab\) => tab\.id === null\)/);
});

test("the sessions action opens an accessible sidebar", () => {
  const renderer = fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8");
  const start = renderer.indexOf("async function runCommand");
  const end = renderer.indexOf("$(\"settings-button\")", start);
  const handler = renderer.slice(start, end);

  assert.match(handler, /id === "sessions"\) \{ setSidebar\(true\)/);
  assert.match(renderer, /function setSidebar\(open\)[\s\S]*?\$\("sidebar"\)\.inert = !open/);
});

test("update badge visibility requires an installer for this platform", () => {
  const renderer = fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8");
  assert.match(renderer, /const hasBadge = status\.available && Boolean\(status\.asset\)/);
});
test("desktop window uses the Voxiva brand mark as its native icon", () => {
  const main = fs.readFileSync(path.join(__dirname, "../main.cjs"), "utf8");
  assert.match(main, /icon:\s*path\.join\(__dirname, "assets", "voxiva-cli-mark\.png"\)/);
});

test("the welcome, composer, and project controls share one centered home block", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const start = html.indexOf('<div class="composer-area">');
  const home = html.slice(start, html.indexOf('<div class="home-footnote"', start));
  assert.ok(home.indexOf('id="welcome"') < home.indexOf('id="composer-form"'));
  assert.match(home, /What are we building\?/);
  assert.match(home, /id="composer-project"/);
  assert.match(home, /id="environment-trigger"/);
});

test("appearance is changed in accessible settings instead of a duplicate header toggle", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const renderer = fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8");
  const topbar = html.slice(html.indexOf('<header class="topbar">'), html.indexOf('</header>'));
  assert.doesNotMatch(topbar, /theme-button/);
  assert.match(html, /data-action="settings"/);
  assert.match(html, /id="theme-select"/);
  assert.match(html, /id="settings-title">Settings/);
  assert.match(renderer, /"settings"/);
  assert.ok(renderer.includes('if (id === "theme") $("theme-select").focus()'));
});


test("Windows title controls blend into the app chrome and remain draggable", () => {
  const main = fs.readFileSync(path.join(__dirname, "../main.cjs"), "utf8");
  const preload = fs.readFileSync(path.join(__dirname, "../preload.cjs"), "utf8");
  const renderer = fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8");
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  assert.ok(main.includes('titleBarStyle: process.platform === "win32" ? "hidden" : undefined'));
  assert.ok(main.includes('titleBarOverlay: process.platform === "win32" ? { color: "#0b1018", symbolColor: "#8f9bb0", height: 42 } : undefined'));
  assert.ok(preload.includes('platform: () => ipcRenderer.invoke("app:platform")'));
  assert.ok(preload.includes('setWindowAppearance: (light) => ipcRenderer.invoke("window:appearance", light)'));
  assert.ok(renderer.includes("body.dataset.platform = platform"));
  assert.ok(css.includes('body[data-platform="win32"] .topbar { padding-right: 140px; }'));
  assert.ok(css.includes("-webkit-app-region: drag"));
  assert.ok(css.includes(".top-leading, .top-actions { -webkit-app-region: no-drag; }"));
});

test("new-session control stays beside tabs and app chrome uses Space dimensions", () => {
  const css = fs.readFileSync(path.join(__dirname, "../styles.css"), "utf8");
  assert.ok(css.includes(".topbar { height: 42px; flex: 0 0 42px;"));
  assert.ok(css.includes(".session-tabs { min-width: 0; max-width: min(560px, 52vw); flex: 0 1 auto;"));
  assert.ok(css.includes(".tab-new { flex: 0 0 28px; }"));
  assert.ok(css.includes(".sidebar-toggle { margin-left: 0;"));
  assert.ok(css.includes("--surface: #06080d;"));
});
