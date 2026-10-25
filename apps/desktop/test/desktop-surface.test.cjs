const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const desktop = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(desktop, file), "utf8");

test("desktop is a focused chat app without a bundled terminal", () => {
  const html = read("index.html");
  const pkg = JSON.parse(read("package.json"));
  const main = read("main.cjs");
  const preload = read("preload.cjs");
  const renderer = read("renderer.js");
  assert.doesNotMatch(html, /terminal|xterm/i);
  assert.doesNotMatch(JSON.stringify(pkg.dependencies), /node-pty|xterm|"node"/i);
  assert.doesNotMatch(main + preload + renderer, /terminal:(?:start|write|resize|data|exit)|node-pty|FitAddon/);
});

test("prompt focus uses a single visible composer outline", () => {
  const css = read("styles.css");
  assert.match(css, /\.composer:focus-within\s*\{[^}]*box-shadow/);
  assert.match(css, /\.composer textarea:focus-visible\s*\{\s*outline:\s*0/);
});
