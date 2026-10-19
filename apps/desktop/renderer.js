const $ = (id) => document.getElementById(id);
const { Terminal } = window;
const { FitAddon } = window.FitAddon;
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
let currentSessionId = null;
let currentSessionTitle = "New session";
let running = false;
let activeSendPromise;
let terminalStarted = false;
let toastTimer;
let currentAssistant;
let currentTheme = "auto";
let currentUpdate;
let updateDownloaded = false;

if (localStorage.getItem("voxiva-sidebar") === "expanded") document.body.classList.add("sidebar-open");

const themeAccent = { auto: "#62b8ff", voxiva: "#62b8ff", slate: "#9aa8bc", midnight: "#4d8fff", arctic: "#7ad7ff", ember: "#e8915a", forest: "#5fb87a", mono: "#c8c8c8" };
function applyTheme(theme) {
  currentTheme = theme;
  const light = theme === "arctic" || (theme === "auto" && matchMedia("(prefers-color-scheme: light)").matches);
  document.body.dataset.theme = light ? "light" : "dark";
  document.documentElement.style.setProperty("--accent", themeAccent[theme] ?? themeAccent.voxiva);
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 3800);
}

function setStatus(label, active = false) {
  $("status-text").textContent = label;
  $("terminal-dot").classList.toggle("running", active);
}

function updateSendButton() {
  $("send-button").disabled = !currentProject || !$("prompt").value.trim() || running;
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
  updateSendButton();
  $("welcome").classList.add("has-project");
  $("prompt").placeholder = `Ask about ${name}…`;
  window.voxiva.branch(cwd).then((branch) => {
    if (currentProject !== cwd) return;
    $("branch-name").textContent = branch ?? "";
    $("branch-chip").hidden = !branch;
  }).catch(() => { $("branch-chip").hidden = true; });
}

function clearMessages() {
  $("messages").replaceChildren();
  currentAssistant = undefined;
  $("welcome").hidden = false;
  $("welcome").classList.toggle("has-project", Boolean(currentProject));
}

async function loadSessions() {
  const list = $("session-list");
  const sessions = await window.voxiva.sessions();
  list.replaceChildren();
  if (!sessions.length) {
    const empty = document.createElement("div");
    empty.className = "empty-session";
    empty.textContent = currentProject ? "Your recent chats will appear here" : "Open a project to start a session";
    list.append(empty);
    return;
  }
  for (const session of sessions) {
    const button = document.createElement("button");
    button.className = "session-entry" + (session.id === currentSessionId ? " active" : "");
    button.type = "button";
    button.title = session.title;
    button.textContent = session.title || "Untitled session";
    button.addEventListener("click", () => openSession(session.id));
    list.append(button);
  }
}

async function openSession(id) {
  try {
    await stopCurrentResponse();
    const session = await window.voxiva.openSession(id);
    currentSessionId = session.id;
    currentSessionTitle = session.title || "Session";
    clearMessages();
    for (const message of session.messages) addMessage(message.role, message.content);
    $("welcome").hidden = session.messages.length > 0;
    $("view-title").textContent = currentSessionTitle;
    await loadState();
    await loadSessions();
    switchView("chat");
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
}

async function loadWorkspaces() {
  const list = $("workspace-list");
  const workspaces = await window.voxiva.workspaces();
  list.replaceChildren();
  if (!workspaces.length) {
    const empty = document.createElement("div");
    empty.className = "empty-session";
    empty.textContent = "Choose a folder to add your first project";
    list.append(empty);
    return;
  }
  for (const workspace of workspaces) {
    const button = document.createElement("button");
    button.className = "workspace-entry" + (workspace.path === currentProject ? " active" : "");
    button.type = "button";
    button.title = workspace.path;
    const name = document.createElement("b");
    name.textContent = workspace.title;
    const folder = document.createElement("small");
    folder.textContent = workspace.path;
    button.append(name, folder);
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await stopCurrentResponse();
        const lastSession = await window.voxiva.lastSession(workspace.path);
        const cwd = await window.voxiva.activateWorkspace(workspace.path);
        const changed = currentProject !== cwd;
        if (changed) {
          currentSessionId = await window.voxiva.newChat();
          currentSessionTitle = "New session";
          clearMessages();
          terminalStarted = false;
        }
        setProject(cwd);
        $("view-title").textContent = currentSessionTitle;
        $("workspace-dialog").close();
        await loadSessions();
        if (lastSession) await openSession(lastSession);
        else if (changed) { currentSessionTitle = "New session"; }
      } catch (error) {
        toast(error instanceof Error ? error.message : String(error));
        button.disabled = false;
      }
    });
    list.append(button);
  }
}

async function openWorkspacePicker() {
  try {
    await loadWorkspaces();
    $("workspace-dialog").showModal();
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
}

async function chooseProject() {
  try {
    const cwd = await window.voxiva.chooseProject();
    if (!cwd) return;
    const changed = currentProject && currentProject !== cwd;
    if (changed) await stopCurrentResponse();
    const lastSession = changed ? await window.voxiva.lastSession(cwd) : null;
    if (changed) {
      currentSessionId = await window.voxiva.newChat();
      currentSessionTitle = "New session";
      clearMessages();
      terminalStarted = false;
    }
    setProject(cwd);
    $("view-title").textContent = currentSessionTitle;
    await loadSessions();
    if (lastSession) await openSession(lastSession);
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
  $("view-title").textContent = terminalView ? "Terminal" : currentSessionTitle;
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
  if (currentSessionTitle === "New session") currentSessionTitle = prompt.replace(/\s+/g, " ").slice(0, 72) || "Session";
  $("prompt").value = "";
  $("prompt").style.height = "auto";
  addMessage("user", prompt);
  currentAssistant = addMessage("assistant", "");
  currentAssistant.content.classList.add("thinking");
  currentAssistant.content.textContent = "Thinking…";
  running = true;
  updateSendButton();
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
    updateSendButton();
    $("send-button").hidden = false;
    $("stop-button").hidden = true;
    $("prompt").disabled = false;
    $("prompt").focus();
    setStatus("Ready");
  }
}

function runPrompt(value) {
  const pending = sendPrompt(value);
  activeSendPromise = pending;
  pending.then(
    () => { if (activeSendPromise === pending) activeSendPromise = undefined; },
    () => { if (activeSendPromise === pending) activeSendPromise = undefined; },
  );
  return pending;
}

async function stopCurrentResponse() {
  if (!running) return;
  await window.voxiva.stopChat();
  await activeSendPromise?.catch(() => {});
}

async function loadState() {
  try {
    const state = await window.voxiva.state();
    const [preferences, options] = await Promise.all([window.voxiva.preferences(), window.voxiva.options()]);
    applyTheme(preferences.theme);
    const themeSelect = $("theme-select");
    if (!themeSelect.options.length) for (const theme of options.themes) themeSelect.add(new Option(theme.label, theme.id));
    themeSelect.value = preferences.theme;
    const localeSelect = $("locale-select");
    if (!localeSelect.options.length) for (const locale of options.locales) localeSelect.add(new Option(locale.native || locale.label, locale.id));
    localeSelect.value = preferences.locale;
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
    renderProviders(state.providers ?? []);
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

function renderProviders(providers) {
  const list = $("provider-list");
  if (!list) return;
  list.replaceChildren();
  for (const provider of providers) {
    const card = document.createElement("section");
    card.className = "provider-card";
    const heading = document.createElement("div");
    heading.className = "provider-heading";
    const identity = document.createElement("div");
    const name = document.createElement("b");
    name.textContent = provider.label;
    const url = document.createElement("small");
    url.textContent = provider.url;
    identity.append(name, url);
    const state = document.createElement("span");
    state.className = "provider-state" + (provider.connected ? " connected" : "");
    state.textContent = provider.connected ? "Connected · " + provider.maskedKey : "Not connected";
    heading.append(identity, state);

    const controls = document.createElement("div");
    controls.className = "provider-controls";
    const input = document.createElement("input");
    input.type = "password";
    input.autocomplete = "new-password";
    input.maxLength = 4096;
    input.placeholder = provider.connected ? "Enter a replacement API key" : "Paste API key";
    input.setAttribute("aria-label", provider.label + " API key");
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") controls.querySelector(".provider-save").click();
    });
    const save = document.createElement("button");
    save.className = "button provider-save";
    save.type = "button";
    save.textContent = provider.connected ? "Replace" : "Connect";
    save.addEventListener("click", async () => {
      save.disabled = true;
      try {
        await window.voxiva.saveProvider({ id: provider.id, apiKey: input.value });
        input.value = "";
        await loadState();
        toast(provider.label + " connected");
      } catch (error) {
        toast(error instanceof Error ? error.message : String(error));
      } finally {
        save.disabled = false;
      }
    });
    controls.append(input, save);
    if (provider.connected) {
      const remove = document.createElement("button");
      remove.className = "button subtle";
      remove.type = "button";
      remove.textContent = "Remove";
      remove.addEventListener("click", async () => {
        remove.disabled = true;
        try {
          await window.voxiva.removeProvider(provider.id);
          await loadState();
          toast(provider.label + " disconnected");
        } catch (error) {
          toast(error instanceof Error ? error.message : String(error));
          remove.disabled = false;
        }
      });
      controls.append(remove);
    }
    card.append(heading, controls);
    list.append(card);
  }
}

$("composer-form").addEventListener("submit", (event) => { event.preventDefault(); runPrompt($("prompt").value); });
$("prompt").addEventListener("input", (event) => {
  const input = event.currentTarget;
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
  updateSendButton();
});
$("prompt").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); $("composer-form").requestSubmit(); }
  if (event.key === "Escape" && running) window.voxiva.stopChat();
});
$("stop-button").addEventListener("click", () => window.voxiva.stopChat());
for (const id of ["open-project", "composer-project", "terminal-open-project"]) $(id).addEventListener("click", chooseProject);
$("attach-file").addEventListener("click", async () => {
  if (!currentProject) return chooseProject();
  try {
    const file = await window.voxiva.chooseContextFile();
    if (!file) return;
    const prompt = $("prompt");
    prompt.value = [prompt.value.trimEnd(), `Read project file: ${file}`].filter(Boolean).join("\n");
    prompt.dispatchEvent(new Event("input", { bubbles: true }));
    prompt.focus();
  } catch (error) { toast(error instanceof Error ? error.message : String(error)); }
});
for (const id of ["nav-terminal", "top-terminal"]) $(id).addEventListener("click", () => switchView("terminal"));
$("nav-chat").addEventListener("click", () => startNewChat().catch((error) => toast(error.message)));
$("terminal-new").addEventListener("click", () => { terminalStarted = false; startTerminal(); });
$("sidebar-toggle").addEventListener("click", () => {
  const open = document.body.classList.toggle("sidebar-open");
  $("sidebar-toggle").title = open ? "Hide sidebar" : "Show sidebar";
  $("sidebar-toggle").setAttribute("aria-label", $("sidebar-toggle").title);
  localStorage.setItem("voxiva-sidebar", open ? "expanded" : "collapsed");
});
$("theme-button").addEventListener("click", async () => {
  const theme = currentTheme === "arctic" ? "voxiva" : "arctic";
  try { await window.voxiva.setPreferences({ theme }); applyTheme(theme); $("theme-select").value = theme; }
  catch (error) { toast(error instanceof Error ? error.message : String(error)); }
});
async function startNewChat() {
  await stopCurrentResponse();
  currentSessionId = await window.voxiva.newChat();
  currentSessionTitle = "New session";
  clearMessages();
  $("view-title").textContent = currentSessionTitle;
  await loadSessions();
  switchView("chat");
}
async function openCommands() {
  const commands = await window.voxiva.commands();
  const list = $("command-list");
  const search = $("command-search");
  const render = () => {
    const query = search.value.trim().toLowerCase();
    list.replaceChildren();
    for (const command of commands.filter((item) => `${item.id} ${item.label}`.toLowerCase().includes(query))) {
      const button = document.createElement("button");
      button.className = "command-entry";
      button.type = "button";
      button.setAttribute("role", "option");
      const label = document.createElement("span");
      label.textContent = command.label;
      const shortcut = document.createElement("small");
      shortcut.textContent = command.shortcut;
      button.append(label, shortcut);
      button.addEventListener("click", () => { $("command-dialog").close(); runCommand(command.id); });
      list.append(button);
    }
  };
  search.value = "";
  search.oninput = render;
  render();
  $("command-dialog").showModal();
  search.focus();
}
async function checkDesktopUpdate({ silent = false } = {}) {
  const status = await window.voxiva.checkUpdate();
  if (!status.available) {
    if (!silent) toast(!status.latest ? "Could not reach GitHub. Try again later." : !status.releaseReady ? "The latest release does not include a desktop installer yet." : "Voxiva is up to date.");
    return;
  }
  currentUpdate = status;
  updateDownloaded = false;
  $("update-title").textContent = `Voxiva ${status.latest} is ready`;
  $("update-description").textContent = status.supportedAction === "release-page"
    ? `Version ${status.latest} is available. Open the release page to download the installer for this device.`
    : `A new desktop release is available (current version ${status.current}). Download the installer for this device when you are ready.`;
  $("update-result").textContent = "";
  $("update-progress-wrap").hidden = true;
  $("update-action").textContent = status.supportedAction === "download" ? "Download update" : "Open release page";
  $("update-action").disabled = false;
  $("update-dialog").showModal();
}
async function runCommand(id) {
  try {
    if (id === "new") return startNewChat();
    if (id === "models" || id === "connect") { await loadState(); $("settings-dialog").showModal(); return; }
    if (id === "plans") { $("plan-select").focus(); return; }
    if (id === "sessions") { document.body.classList.add("sidebar-open"); $("session-list").scrollIntoView({ block: "nearest" }); return; }
    if (id === "workspaces") return openWorkspacePicker();
    if (id === "terminal") return switchView("terminal");
    if (id === "doctor") {
      const result = await window.voxiva.doctor();
      $("doctor-output").textContent = [
        `Runtime  ${result.runtime}`,
        `Model    ${result.model} (${result.modelReady ? "ready" : "not available"})`,
        `Providers ${result.providers.join(", ") || "free model only"}`,
        `Project  ${result.project ?? "none selected"}`,
        `Updates  ${result.update}`,
      ].join("\n");
      $("doctor-dialog").showModal();
      return;
    }
    if (id === "update") return checkDesktopUpdate();
  } catch (error) { toast(error instanceof Error ? error.message : String(error)); }
}
$("settings-button").addEventListener("click", () => {
  loadState().then(() => $("settings-dialog").showModal()).catch((error) => toast(error.message));
});
$("settings-close").addEventListener("click", () => $("settings-dialog").close());
$("settings-done").addEventListener("click", () => $("settings-dialog").close());
$("theme-select").addEventListener("change", async (event) => {
  try { await window.voxiva.setPreferences({ theme: event.currentTarget.value }); applyTheme(event.currentTarget.value); }
  catch (error) { toast(error instanceof Error ? error.message : String(error)); await loadState(); }
});
$("locale-select").addEventListener("change", async (event) => {
  try { await window.voxiva.setPreferences({ locale: event.currentTarget.value }); toast("Reply language saved for the CLI and desktop app."); }
  catch (error) { toast(error instanceof Error ? error.message : String(error)); await loadState(); }
});
$("commands-button").addEventListener("click", () => openCommands().catch((error) => toast(error.message)));
$("commands-close").addEventListener("click", () => $("command-dialog").close());
$("commands-done").addEventListener("click", () => $("command-dialog").close());
$("doctor-close").addEventListener("click", () => $("doctor-dialog").close());
$("doctor-done").addEventListener("click", () => $("doctor-dialog").close());
async function closeUpdateDialog() {
  if (!updateDownloaded && $("update-progress-wrap").hidden === false) await window.voxiva.cancelUpdate();
  $("update-dialog").close();
}
$("update-close").addEventListener("click", closeUpdateDialog);
$("update-later").addEventListener("click", closeUpdateDialog);
$("update-action").addEventListener("click", async () => {
  const action = $("update-action");
  if (currentUpdate?.supportedAction === "release-page") {
    try { await window.voxiva.openRelease(); } catch (error) { $("update-result").textContent = error.message; }
    return;
  }
  if (updateDownloaded) {
    try { await window.voxiva.openUpdate(); $("update-result").textContent = "Installer opened. Follow its prompts to finish updating."; }
    catch (error) { $("update-result").textContent = error instanceof Error ? error.message : String(error); }
    return;
  }
  action.disabled = true;
  $("update-progress-wrap").hidden = false;
  $("update-progress-label").textContent = "Starting download…";
  try {
    const result = await window.voxiva.downloadUpdate();
    updateDownloaded = true;
    action.textContent = "Open installer";
    $("update-result").textContent = `Saved to ${result.path}`;
  } catch (error) {
    $("update-result").textContent = error instanceof Error ? error.message : String(error);
  } finally { action.disabled = false; }
});
window.voxiva.onUpdateProgress(({ percent, received, total }) => {
  $("update-progress-wrap").hidden = false;
  $("update-progress-bar").style.width = `${percent ?? 10}%`;
  $("update-progress-label").textContent = percent == null ? `${Math.floor(received / 1048576)} MB downloaded` : `Downloading update · ${percent}%`;
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openCommands().catch((error) => toast(error.message)); }
});
$("workspace-button").addEventListener("click", openWorkspacePicker);
$("workspace-close").addEventListener("click", () => $("workspace-dialog").close());
$("workspace-done").addEventListener("click", () => $("workspace-dialog").close());
$("workspace-add").addEventListener("click", () => { $("workspace-dialog").close(); chooseProject(); });
$("new-session-button").addEventListener("click", () => startNewChat().catch((error) => toast(error.message)));
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
  runPrompt(button.dataset.prompt ?? "");
}));

window.voxiva.onReply(({ text, sessionId, title }) => {
  if (!currentAssistant) return;
  currentAssistant.content.textContent = text;
  currentAssistant.content.classList.remove("thinking");
  currentSessionId = sessionId ?? currentSessionId;
  currentSessionTitle = title || currentSessionTitle;
  $("view-title").textContent = currentSessionTitle;
  loadSessions().catch((error) => toast(error.message));
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
window.voxiva.onSessionChanged(() => loadSessions().catch((error) => toast(error.message)));
window.voxiva.onWarning((message) => toast(message));
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
if (initialProject) {
  setProject(initialProject);
  await loadSessions();
  const lastSession = await window.voxiva.lastSession(initialProject);
  if (lastSession) await openSession(lastSession);
}
checkDesktopUpdate({ silent: true }).catch(() => {});
