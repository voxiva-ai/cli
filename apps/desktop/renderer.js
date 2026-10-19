import { Terminal } from "./node_modules/@xterm/xterm/lib/xterm.js";
import { FitAddon } from "./node_modules/@xterm/addon-fit/lib/addon-fit.js";

const $ = (id) => document.getElementById(id);
const terminal = new Terminal({
  allowProposedApi: false,
  convertEol: false,
  cursorBlink: true,
  fontFamily: '"Cascadia Code", "SFMono-Regular", Consolas, monospace',
  fontSize: 14,
  lineHeight: 1.25,
  scrollback: 5000,
  theme: { background: "#101319", foreground: "#dce2ed", cursor: "#54b3f5", selectionBackground: "#31527688", black: "#11151c", red: "#ff747c", green: "#4bd7a0", yellow: "#f3c968", blue: "#4aa5ff", magenta: "#c59af7", cyan: "#60d8e6", white: "#d9e2ee", brightBlack: "#667386", brightRed: "#ff9198", brightGreen: "#6ce8b4", brightYellow: "#ffdb88", brightBlue: "#75baff", brightMagenta: "#d6b4ff", brightCyan: "#8beaf3", brightWhite: "#fff" },
});
const fit = new FitAddon();
terminal.loadAddon(fit);
let currentProject = null;
let running = false;
let terminalStarted = false;
let toastTimer;
let currentAssistant;

$("logo").src = window.voxiva.logoUrl;
$("welcome-logo").src = window.voxiva.logoUrl;
if (localStorage.getItem("voxiva-theme")) document.body.dataset.theme = localStorage.getItem("voxiva-theme");
if (localStorage.getItem("voxiva-sidebar") === "expanded") document.body.classList.add("sidebar-open");

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 3800);
}

function setStatus(label, active = false) {
  $("status-text").textContent = label;
  $("status-dot").classList.toggle("running", active);
  $("terminal-dot").classList.toggle("running", active);
}

function setProject(cwd) {
  currentProject = cwd;
  const name = cwd.replace(/[\\/]$/, "").split(/[\\/]/).at(-1) || cwd;
  $("workspace-name").textContent = name;
  $("workspace-path").textContent = cwd;
  $("top-project").textContent = name;
  $("terminal-project").textContent = cwd;
  $("context-label").textContent = name;
  $("prompt").disabled = false;
  $("send-button").disabled = false;
  $("welcome").classList.add("has-project");
  $("prompt").placeholder = `Ask about ${name}…`;
}

async function chooseProject() {
  try {
    const cwd = await window.voxiva.chooseProject();
    if (!cwd) return;
    if (currentProject && currentProject !== cwd) {
      await window.voxiva.newChat();
      $("messages").replaceChildren();
      $("welcome").hidden = false;
      terminalStarted = false;
    }
    setProject(cwd);
    if (!$("terminal-view").hidden) startTerminal();
    $("prompt").focus();
    setStatus("Project ready");
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
}

function switchView(view) {
  const terminalView = view === "terminal";
  $("chat-view").hidden = terminalView;
  $("terminal-view").hidden = !terminalView;
  $("nav-chat").classList.toggle("active", !terminalView);
  $("nav-terminal").classList.toggle("active", terminalView);
  $("view-title").textContent = terminalView ? "Terminal" : "New session";
  if (terminalView) {
    if (!currentProject) { chooseProject(); return; }
    startTerminal();
    requestAnimationFrame(() => { fit.fit(); terminal.focus(); });
  } else {
    $("prompt").focus();
  }
}

async function startTerminal() {
  if (!currentProject) return;
  if (terminalStarted) {
    requestAnimationFrame(() => { fit.fit(); terminal.focus(); });
    return;
  }
  terminal.reset();
  try {
    await window.voxiva.start(currentProject);
    terminalStarted = true;
    setStatus("Terminal connected", true);
    requestAnimationFrame(() => { fit.fit(); window.voxiva.resize(terminal.cols, terminal.rows); terminal.focus(); });
  } catch (error) {
    terminalStarted = false;
    setStatus("Terminal stopped");
    toast(error instanceof Error ? error.message : String(error));
  }
}

function addMessage(role, text = "") {
  const row = document.createElement("article");
  row.className = `message ${role}`;
  const body = document.createElement("div");
  body.className = "message-body";
  const label = document.createElement("div");
  label.className = "message-label";
  label.textContent = role === "assistant" ? "VOXIVA" : "YOU";
  const content = document.createElement("div");
  content.className = "message-content";
  content.textContent = text;
  body.append(label, content);
  row.append(body);
  $("messages").append(row);
  $("welcome").hidden = true;
  $("chat-scroll").scrollTop = $("chat-scroll").scrollHeight;
  return { row, content };
}

function renderProposal({ id, files }) {
  const card = document.createElement("section");
  card.className = "change-card";
  const heading = document.createElement("div");
  heading.className = "change-heading";
  const title = document.createElement("b");
  title.textContent = `${files.length} proposed ${files.length === 1 ? "change" : "changes"}`;
  const tag = document.createElement("span");
  tag.textContent = "REVIEW BEFORE APPLYING";
  heading.append(title, tag);
  const list = document.createElement("div");
  list.className = "change-files";
  for (const file of files) {
    const item = document.createElement("div");
    item.className = "change-file";
    const icon = document.createElement("span");
    icon.className = "file-mark";
    icon.textContent = file.exists ? "↻" : "+";
    const name = document.createElement("b");
    name.textContent = file.path;
    const action = document.createElement("small");
    action.textContent = file.exists ? "Update" : "Create";
    item.append(icon, name, action);
    list.append(item);
    if (file.preview) {
      const preview = document.createElement("p");
      preview.className = "file-preview";
      preview.textContent = file.preview;
      list.append(preview);
    }
  }
  const actions = document.createElement("div");
  actions.className = "change-actions";
  const apply = document.createElement("button");
  apply.className = "button apply-button";
  apply.textContent = "Apply changes";
  apply.addEventListener("click", async () => {
    apply.disabled = true;
    try {
      const paths = await window.voxiva.applyEdits(id);
      title.textContent = `Applied ${paths.length} ${paths.length === 1 ? "change" : "changes"}`;
      tag.textContent = "SAVED TO PROJECT";
      actions.remove();
      setStatus("Changes applied");
    } catch (error) {
      apply.disabled = false;
      toast(error instanceof Error ? error.message : String(error));
    }
  });
  const skip = document.createElement("button");
  skip.className = "button subtle";
  skip.textContent = "Dismiss";
  skip.addEventListener("click", () => {
    window.voxiva.discardEdits(id);
    card.remove();
  });
  actions.append(apply, skip);
  card.append(heading, list, actions);
  (currentAssistant?.row ?? $("messages")).append(card);
  $("chat-scroll").scrollTop = $("chat-scroll").scrollHeight;
}

async function sendPrompt(value) {
  const prompt = value.trim();
  if (!prompt || running) return;
  if (!currentProject) { toast("Choose a project folder first."); return; }
  $("prompt").value = "";
  $("prompt").style.height = "auto";
  addMessage("user", prompt);
  currentAssistant = addMessage("assistant", "");
  currentAssistant.content.classList.add("thinking");
  currentAssistant.content.textContent = "Thinking…";
  running = true;
  $("send-button").hidden = true;
  $("stop-button").hidden = false;
  $("prompt").disabled = true;
  setStatus("Thinking", true);
  try {
    const result = await window.voxiva.sendChat(prompt);
    if (result?.stopped) currentAssistant.content.textContent = "Response stopped.";
  } catch (error) {
    currentAssistant.content.textContent = error instanceof Error ? error.message : String(error);
    currentAssistant.content.classList.add("error-text");
  } finally {
    currentAssistant.content.classList.remove("thinking");
    running = false;
    $("send-button").hidden = false;
    $("stop-button").hidden = true;
    $("prompt").disabled = false;
    $("prompt").focus();
    setStatus("Ready");
  }
}

async function loadState() {
  try {
    const state = await window.voxiva.state();
    const models = $("model-select");
    models.replaceChildren();
    for (const model of state.models) {
      const option = document.createElement("option");
      option.value = model.ref;
      option.textContent = model.label;
      models.append(option);
    }
    if (state.models.some((model) => model.ref === state.model)) models.value = state.model;
    else if (state.models[0]) {
      models.value = state.models[0].ref;
      await window.voxiva.setModel(models.value);
    }
    $("model-caption").textContent = models.selectedOptions[0]?.textContent ?? "Connect a model";
    const plan = $("plan-select");
    plan.replaceChildren();
    for (const item of state.plans) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = `${item.label} · ${item.description}`;
      plan.append(option);
    }
    plan.value = state.plan;
    $("plan-chip-label").textContent = state.plans.find((item) => item.id === state.plan)?.label ?? "Build";
    $("status-meta").textContent = `${$("plan-chip-label").textContent} · ${models.selectedOptions[0]?.textContent ?? "Voxiva"}`;
  } catch (error) {
    $("model-caption").textContent = "Model settings unavailable";
    $("status-text").textContent = "Startup error";
    toast(error instanceof Error ? error.message : String(error));
  }
}

$("composer-form").addEventListener("submit", (event) => { event.preventDefault(); sendPrompt($("prompt").value); });
$("prompt").addEventListener("input", (event) => {
  const input = event.currentTarget;
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
});
$("prompt").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); $("composer-form").requestSubmit(); }
  if (event.key === "Escape" && running) window.voxiva.stopChat();
});
$("stop-button").addEventListener("click", () => window.voxiva.stopChat());
for (const id of ["open-project", "workspace-button", "composer-project", "terminal-open-project"]) $(id).addEventListener("click", chooseProject);
for (const id of ["nav-terminal", "top-terminal"]) $(id).addEventListener("click", () => switchView("terminal"));
$("nav-chat").addEventListener("click", () => startNewChat());
$("terminal-new").addEventListener("click", () => { terminalStarted = false; startTerminal(); });
$("sidebar-toggle").addEventListener("click", () => {
  const open = document.body.classList.toggle("sidebar-open");
  $("sidebar-toggle").title = open ? "Hide sidebar" : "Show sidebar";
  $("sidebar-toggle").setAttribute("aria-label", $("sidebar-toggle").title);
  localStorage.setItem("voxiva-sidebar", open ? "expanded" : "collapsed");
});
$("theme-button").addEventListener("click", () => {
  const light = document.body.dataset.theme !== "light";
  document.body.dataset.theme = light ? "light" : "dark";
  localStorage.setItem("voxiva-theme", light ? "light" : "dark");
});
async function startNewChat() {
  await window.voxiva.newChat();
  $("messages").replaceChildren();
  currentAssistant = undefined;
  $("welcome").hidden = false;
  $("welcome").classList.toggle("has-project", Boolean(currentProject));
  $("view-title").textContent = "New chat";
  switchView("chat");
}
$("settings-button").addEventListener("click", () => {
  toast("To connect providers and manage keys, open Terminal and use /connect or /model.");
  switchView("terminal");
});
$("plan-chip").addEventListener("click", () => $("plan-select").focus());
$("plan-select").addEventListener("change", async (event) => {
  try {
    await window.voxiva.setPlan(event.currentTarget.value);
    $("plan-chip-label").textContent = event.currentTarget.selectedOptions[0]?.textContent.split(" · ")[0] ?? "Build";
    $("status-meta").textContent = $("plan-chip-label").textContent + " · " + ($("model-select").selectedOptions[0]?.textContent ?? "Voxiva");
  } catch (error) { toast(error instanceof Error ? error.message : String(error)); await loadState(); }
});
$("model-select").addEventListener("change", async (event) => {
  try {
    await window.voxiva.setModel(event.currentTarget.value);
    $("model-caption").textContent = event.currentTarget.selectedOptions[0]?.textContent ?? "";
    $("status-meta").textContent = `${$("plan-chip-label").textContent} · ${event.currentTarget.selectedOptions[0]?.textContent ?? "Voxiva"}`;
  } catch (error) { toast(error instanceof Error ? error.message : String(error)); await loadState(); }
});
document.querySelectorAll(".suggestion").forEach((button) => button.addEventListener("click", async () => {
  if (!currentProject) {
    $("prompt").value = button.dataset.prompt ?? "";
    await chooseProject();
    return;
  }
  sendPrompt(button.dataset.prompt ?? "");
}));

window.voxiva.onReply(({ text }) => {
  if (!currentAssistant) return;
  currentAssistant.content.textContent = text;
  currentAssistant.content.classList.remove("thinking");
  $("view-title").textContent = "Session";
});
window.voxiva.onChunk((chunk) => {
  if (!currentAssistant) return;
  if (currentAssistant.content.classList.contains("thinking")) currentAssistant.content.textContent = "";
  currentAssistant.content.classList.remove("thinking");
  currentAssistant.content.textContent += chunk;
  $("chat-scroll").scrollTop = $("chat-scroll").scrollHeight;
});
window.voxiva.onReset((message) => {
  if (!currentAssistant) return;
  currentAssistant.content.textContent = message;
  currentAssistant.content.classList.add("thinking");
});
window.voxiva.onEdits((proposal) => renderProposal(proposal));
terminal.open($("terminal"));
terminal.onData((data) => window.voxiva.write(data));
terminal.onResize(({ cols, rows }) => window.voxiva.resize(cols, rows));
terminal.attachCustomKeyEventHandler((event) => {
  if (event.type !== "keydown" || !event.ctrlKey || !event.shiftKey) return true;
  if (event.key.toLowerCase() === "c" && terminal.hasSelection()) {
    navigator.clipboard.writeText(terminal.getSelection()).catch(() => {});
    return false;
  }
  if (event.key.toLowerCase() === "v") {
    navigator.clipboard.readText().then((text) => terminal.paste(text)).catch(() => {});
    return false;
  }
  return true;
});
window.voxiva.onData((data) => terminal.write(data));
window.voxiva.onExit((code) => {
  terminalStarted = false;
  setStatus(code === 0 ? "Terminal ended" : `Terminal stopped · ${code}`);
});
new ResizeObserver(() => { if (!$("terminal-view").hidden) fit.fit(); }).observe($("terminal-view"));
document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === "n") { event.preventDefault(); startNewChat(); }
  if ((event.ctrlKey || event.metaKey) && key === "j") { event.preventDefault(); $("nav-terminal").click(); }
});

await loadState();
const initialProject = await window.voxiva.initialProject();
if (initialProject) setProject(initialProject);
