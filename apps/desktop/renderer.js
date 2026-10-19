import { Terminal } from "./node_modules/@xterm/xterm/lib/xterm.js";
import { FitAddon } from "./node_modules/@xterm/addon-fit/lib/addon-fit.js";

const terminal = new Terminal({
  allowProposedApi: false,
  convertEol: false,
  cursorBlink: true,
  fontFamily: '"Cascadia Code", "SFMono-Regular", Consolas, monospace',
  fontSize: 14,
  lineHeight: 1.25,
  scrollback: 5000,
  theme: {
    background: "#090c11",
    foreground: "#d9e2ee",
    cursor: "#57b7ff",
    selectionBackground: "#28527a88",
    black: "#11151c",
    red: "#ff747c",
    green: "#4bd7a0",
    yellow: "#f3c968",
    blue: "#4aa5ff",
    magenta: "#c59af7",
    cyan: "#60d8e6",
    white: "#d9e2ee",
    brightBlack: "#667386",
    brightRed: "#ff9198",
    brightGreen: "#6ce8b4",
    brightYellow: "#ffdb88",
    brightBlue: "#75baff",
    brightMagenta: "#d6b4ff",
    brightCyan: "#8beaf3",
    brightWhite: "#ffffff",
  },
});
const fit = new FitAddon();
terminal.loadAddon(fit);

const $ = (id) => document.getElementById(id);
const openButtons = [$("open-project"), $("welcome-open")];
let currentProject = null;
let toastTimer;

$("logo").src = window.voxiva.logoUrl;
$("welcome-logo").src = window.voxiva.logoUrl;

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("visible"), 3600);
}

function setStatus(status, running = false) {
  $("status-text").textContent = status;
  $("status-dot").classList.toggle("running", running);
}

async function start(cwd) {
  if (!cwd) return;
  terminal.reset();
  currentProject = cwd;
  $("project-path").textContent = cwd;
  $("welcome").hidden = true;
  $("terminal-shell").hidden = false;
  $("restart").disabled = false;
  setStatus("Starting Voxiva…", true);
  try {
    await window.voxiva.start(cwd);
    setStatus("Session ready", true);
    requestAnimationFrame(() => {
      fit.fit();
      terminal.focus();
      window.voxiva.resize(terminal.cols, terminal.rows);
    });
  } catch (error) {
    setStatus("Could not start");
    toast(error instanceof Error ? error.message : String(error));
  }
}

async function openProject() {
  try {
    const cwd = await window.voxiva.chooseProject();
    if (cwd) await start(cwd);
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
}

for (const button of openButtons) button.addEventListener("click", openProject);
$("restart").addEventListener("click", () => start(currentProject));

terminal.open($("terminal"));
terminal.onData((data) => window.voxiva.write(data));
terminal.attachCustomKeyEventHandler((event) => {
  if (event.type !== "keydown" || !event.ctrlKey || !event.shiftKey) return true;
  const key = event.key.toLowerCase();
  if (key === "c" && terminal.hasSelection()) {
    navigator.clipboard.writeText(terminal.getSelection()).catch(() => {});
    return false;
  }
  if (key === "v") {
    navigator.clipboard.readText().then((text) => terminal.paste(text)).catch(() => {});
    return false;
  }
  return true;
});

window.voxiva.onData((data) => terminal.write(data));
window.voxiva.onExit((code) => {
  setStatus(code === 0 ? "Session ended" : `Session stopped · ${code}`);
});
terminal.onResize(({ cols, rows }) => window.voxiva.resize(cols, rows));
new ResizeObserver(() => {
  if (!$("terminal-shell").hidden) fit.fit();
}).observe($("terminal-shell"));

const initialProject = await window.voxiva.initialProject();
if (initialProject) await start(initialProject);
