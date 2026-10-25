const $ = (id) => document.getElementById(id);
window.voxiva.platform().then((platform) => { document.body.dataset.platform = platform; });
const sameProjectPath = (left, right) => left?.replace(/[\\/]+/g, "/").replace(/\/$/, "").toLowerCase() === right?.replace(/[\\/]+/g, "/").replace(/\/$/, "").toLowerCase();
const assistantStream = window.voxivaStreamBuffer.createStreamBuffer({
  schedule: requestAnimationFrame,
  cancel: cancelAnimationFrame,
  write(text) {
    const content = currentAssistant?.content;
    if (!content) return;
    if (content.classList.contains("thinking")) content.replaceChildren();
    content.classList.remove("thinking");
    if (content.lastChild?.nodeType === Node.TEXT_NODE) content.lastChild.appendData(text);
    else content.append(document.createTextNode(text));
    $("chat-scroll").scrollTop = $("chat-scroll").scrollHeight;
  },
});
let currentProject = null;
let currentSessionId = null;
let currentSessionTitle = "New session";
let currentDraft = true;
let running = false;
let activeSendPromise;
let toastTimer;
let currentAssistant;
let currentTheme = "auto";
let currentLocale = "en";
let currentPlan = "build";
let currentUpdate;
let updateDownloaded = false;
let availableModels = [];
let availableProviders = [];
let selectedModelRef = "";
let availablePlans = [];
let availableThemes = [];
let availableLocales = [];
let openTabs = [{ id: null, title: "New session" }];

if (localStorage.getItem("voxiva-sidebar") !== "collapsed") {
  document.body.classList.add("sidebar-open");
  $("sidebar").inert = false;
  $("sidebar-toggle").title = "Hide sidebar";
  $("sidebar-toggle").setAttribute("aria-label", "Hide sidebar");
}

const themeAccent = { auto: "#62b8ff", voxiva: "#62b8ff", slate: "#9aa8bc", midnight: "#4d8fff", arctic: "#7ad7ff", ember: "#e8915a", forest: "#5fb87a", mono: "#c8c8c8" };
function applyTheme(theme) {
  currentTheme = theme;
  const appearance = localStorage.getItem("voxiva-appearance");
  const light = appearance ? appearance === "light" : theme === "arctic" || (theme === "auto" && matchMedia("(prefers-color-scheme: light)").matches);
  document.body.dataset.theme = light ? "light" : "dark";
  document.documentElement.style.setProperty("--accent", themeAccent[theme] ?? themeAccent.voxiva);
  window.voxiva.setWindowAppearance(light).catch(() => {});
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 3800);
}

function setStatus(label) {
  $("status-text").textContent = label;
}

function updateSendButton() {
  $("send-button").disabled = !currentProject || !$("prompt").value.trim() || running;
}

function renderTabs() {
  const list = $("session-tabs");
  list.replaceChildren();
  for (const tab of openTabs) {
    const active = tab.id === currentSessionId || (tab.id === null && currentDraft);
    const item = document.createElement("div");
    item.className = "session-tab" + (active ? " active" : "");
    item.setAttribute("role", "presentation");
    const select = document.createElement("button");
    select.type = "button";
    select.setAttribute("role", "tab");
    select.setAttribute("aria-selected", String(active));
    select.title = tab.title;
    select.textContent = tab.title;
    select.addEventListener("click", () => tab.id ? openSession(tab.id) : startNewChat());
    const close = document.createElement("button");
    close.type = "button";
    close.className = "tab-close";
    close.title = `Close ${tab.title}`;
    close.setAttribute("aria-label", close.title);
    close.textContent = "×";
    close.addEventListener("click", () => closeTab(tab));
    item.append(select, close);
    list.append(item);
  }
}

async function closeTab(tab) {
  const index = openTabs.indexOf(tab);
  if (index < 0) return;
  openTabs.splice(index, 1);
  if (!openTabs.length) openTabs.push({ id: null, title: "New session" });
  const active = tab.id === currentSessionId || (tab.id === null && currentDraft);
  if (!active) { renderTabs(); return; }
  const next = openTabs[Math.max(0, index - 1)];
  if (next.id) await openSession(next.id);
  else await startNewChat();
}

function rememberTab(id, title) {
  let tab = openTabs.find((item) => item.id === id);
  if (!tab) { tab = { id, title }; openTabs.push(tab); }
  tab.title = title;
  renderTabs();
}

function setProject(cwd) {
  currentProject = cwd;
  const name = cwd.replace(/[\\/]$/, "").split(/[\\/]/).at(-1) || cwd;
  $("workspace-name").textContent = name;
  $("workspace-path").textContent = cwd;
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
  window.voxiva.mainWorktree(cwd).then((main) => {
    if (currentProject === cwd) {
      const isWorktree = !sameProjectPath(main, cwd);
      $("environment-label").textContent = isWorktree ? "Рабочее пространство" : "Локальный репозиторий";
      $("environment-local").setAttribute("aria-checked", String(!isWorktree));
      $("environment-worktree").setAttribute("aria-checked", String(isWorktree));
    }
  }).catch(() => { if (currentProject === cwd) $("environment-label").textContent = "Локальный репозиторий"; });
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
    currentDraft = false;
    rememberTab(session.id, currentSessionTitle);
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

async function openWorkspacePicker(trigger = $("composer-project")) {
  try {
    await renderProjectOptions();
    showPopover("project-menu", trigger);
    $("project-search").focus();
  } catch (error) {
    toast(error instanceof Error ? error.message : String(error));
  }
}

function positionPopover(popover, trigger) {
  const rect = trigger.getBoundingClientRect();
  popover.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - popover.offsetWidth - 8))}px`;
  const preferredTop = rect.bottom + popover.offsetHeight + 8 > innerHeight ? rect.top - popover.offsetHeight - 6 : rect.bottom + 6;
  popover.style.top = `${Math.max(8, Math.min(preferredTop, innerHeight - popover.offsetHeight - 8))}px`;
}

function showPopover(id, trigger) {
  const popover = $(id);
  popover.showPopover();
  positionPopover(popover, trigger);
}

function renderChoiceMenu(id, items, selectedId, choose) {
  const menu = $(id);
  menu.replaceChildren();
  for (const item of items) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "choice-option";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(item.id === selectedId));
    const copy = document.createElement("span");
    copy.className = "choice-copy";
    const label = document.createElement("b");
    label.textContent = item.label;
    copy.append(label);
    if (item.description) {
      const description = document.createElement("small");
      description.textContent = item.description;
      copy.append(description);
    }
    const check = document.createElement("span");
    check.className = "choice-check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = "✓";
    option.append(copy, check);
    option.addEventListener("click", () => Promise.resolve(choose(item)).then(() => menu.hidePopover()).catch((error) => toast(error.message)));
    menu.append(option);
  }
}

const choiceMenus = [["plan-chip", "plan-menu"], ["theme-choice", "theme-menu"], ["locale-choice", "locale-menu"]];
function toggleChoiceMenu(triggerId, menuId) {
  const trigger = $(triggerId);
  const menu = $(menuId);
  if (menu.matches(":popover-open")) { menu.hidePopover(); return; }
  showPopover(menuId, trigger);
  menu.querySelector('[aria-selected="true"]')?.focus();
}

for (const [triggerId, menuId] of choiceMenus) {
  const trigger = $(triggerId);
  const menu = $(menuId);
  trigger.addEventListener("click", () => toggleChoiceMenu(triggerId, menuId));
  menu.addEventListener("toggle", (event) => trigger.setAttribute("aria-expanded", String(event.newState === "open")));
  menu.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { event.preventDefault(); menu.hidePopover(); trigger.focus(); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const options = [...menu.querySelectorAll('[role="option"]')];
    if (!options.length) return;
    event.preventDefault();
    const current = options.indexOf(event.target);
    const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
    options[next].focus();
  });
}

async function renderProjectOptions() {
  const options = $("project-options");
  const query = $("project-search").value.trim().toLocaleLowerCase();
  const workspaces = await window.voxiva.workspaces();
  options.replaceChildren();
  for (const workspace of workspaces.filter((item) => `${item.title} ${item.path}`.toLocaleLowerCase().includes(query))) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(workspace.path === currentProject));
    button.innerHTML = `<span class="project-mark">▣</span><span class="project-copy"><b></b><small></small></span><span class="project-check">✓</span>`;
    button.querySelector("b").textContent = workspace.title;
    button.querySelector("small").textContent = workspace.path;
    button.addEventListener("click", () => activateProject(workspace.path));
    options.append(button);
  }
  if (!options.childElementCount) {
    const empty = document.createElement("div");
    empty.className = "menu-empty";
    empty.textContent = query ? "Проекты не найдены" : "Недавних проектов пока нет";
    options.append(empty);
  }
}

async function activateProject(requestedPath) {
  try {
    $("project-menu").hidePopover();
    await stopCurrentResponse();
    const lastSession = requestedPath === currentProject ? null : await window.voxiva.lastSession(requestedPath);
    const cwd = await window.voxiva.activateWorkspace(requestedPath);
    if (currentProject !== cwd) {
      currentSessionId = await window.voxiva.newChat();
      currentSessionTitle = "New session";
      currentDraft = true;
      clearMessages();
      openTabs = [{ id: null, title: currentSessionTitle }];
    }
    setProject(cwd);
    renderTabs();
    await loadSessions();
    if (lastSession) await openSession(lastSession);
  } catch (error) { toast(error instanceof Error ? error.message : String(error)); }
}

async function createProjectWorktree(event) {
  event.preventDefault();
  const button = $("worktree-form").querySelector("button");
  const navigation = ["app-menu-trigger", "composer-project", "workspace-button", "open-project", "environment-trigger", "environment-worktree"].map((id) => $(id));
  const previousDisabled = navigation.map((element) => element.disabled);
  navigation.forEach((element) => { element.disabled = true; });
  button.disabled = true;
  try {
    await stopCurrentResponse();
    const result = await window.voxiva.createWorktree(currentProject, $("worktree-name").value);
    $("environment-menu").hidePopover();
    $("worktree-form").hidden = true;
    $("worktree-name").value = "";
    setProject(result.cwd);
    currentSessionId = await window.voxiva.newChat();
    currentSessionTitle = "New session";
    currentDraft = true;
    openTabs = [{ id: null, title: currentSessionTitle }];
    renderTabs();
    clearMessages();
    await loadSessions();
    $("environment-label").textContent = "Рабочее пространство";
    toast(result.hasChanges ? "Рабочее пространство создано. Незакоммиченные изменения остались в исходной папке." : "Рабочее пространство создано.");
  } catch (error) { toast(error instanceof Error ? error.message : String(error)); }
  finally { button.disabled = false; navigation.forEach((element, index) => { element.disabled = previousDisabled[index]; }); }
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
      currentDraft = true;
      openTabs = [{ id: null, title: currentSessionTitle }];
      renderTabs();
      clearMessages();
    }
    setProject(cwd);
    $("view-title").textContent = currentSessionTitle;
    await loadSessions();
    if (lastSession) await openSession(lastSession);
    $("prompt").focus();
    setStatus("Project ready");
  } catch (error) {
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
  assistantStream.clear();
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
    if (result?.stopped && currentAssistant) { assistantStream.clear(); currentAssistant.content.textContent = "Response stopped."; }
  } catch (error) {
    if (currentAssistant) {
      assistantStream.clear();
      currentAssistant.content.textContent = error instanceof Error ? error.message : String(error);
      currentAssistant.content.classList.add("error-text");
    }
  } finally {
    assistantStream.clear();
    currentAssistant?.content.classList.remove("thinking");
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
    const [state, preferences, options] = await Promise.all([window.voxiva.state(), window.voxiva.preferences(), window.voxiva.options()]);
    applyTheme(preferences.theme);
    currentLocale = preferences.locale;
    availableThemes = options.themes.map((theme) => theme.id === "auto" ? { ...theme, label: "Auto" } : theme);
    availableLocales = options.locales.map((locale) => ({ id: locale.id, label: locale.native || locale.label }));
    $("theme-label").textContent = options.themes.find((item) => item.id === currentTheme)?.label ?? currentTheme;
    $("locale-label").textContent = availableLocales.find((item) => item.id === currentLocale)?.label ?? currentLocale;
    renderChoiceMenu("theme-menu", availableThemes, currentTheme, selectTheme);
    renderChoiceMenu("locale-menu", availableLocales, currentLocale, selectLocale);
    availableModels = state.models;
    availableProviders = state.providers ?? [];
    selectedModelRef = state.models.some((model) => model.ref === state.model) ? state.model : state.models[0]?.ref ?? "";
    if (selectedModelRef && selectedModelRef !== state.model) await window.voxiva.setModel(selectedModelRef);
    renderModelPicker();
    renderProviders(state.providers ?? []);
    availablePlans = state.plans;
    currentPlan = state.plan;
    renderChoiceMenu("plan-menu", availablePlans, currentPlan, selectPlan);
    $("plan-chip-label").textContent = availablePlans.find((item) => item.id === currentPlan)?.label ?? "Build";
    $("status-meta").textContent = `${$("plan-chip-label").textContent} · ${availableModels.find((model) => model.ref === selectedModelRef)?.label ?? "Voxiva"}`;
  } catch (error) {
    $("model-caption").textContent = "Model settings unavailable";
    $("status-text").textContent = "Startup error";
    toast(error instanceof Error ? error.message : String(error));
  }
}

async function selectPlan(item) {
  await window.voxiva.setPlan(item.id);
  currentPlan = item.id;
  $("plan-chip-label").textContent = item.label;
  $("status-meta").textContent = `${item.label} · ${availableModels.find((model) => model.ref === selectedModelRef)?.label ?? "Voxiva"}`;
  renderChoiceMenu("plan-menu", availablePlans, currentPlan, selectPlan);
}

async function selectTheme(item) {
  await window.voxiva.setPreferences({ theme: item.id });
  localStorage.removeItem("voxiva-appearance");
  applyTheme(item.id);
  $("theme-label").textContent = item.label;
  renderChoiceMenu("theme-menu", availableThemes, item.id, selectTheme);
}

async function selectLocale(item) {
  await window.voxiva.setPreferences({ locale: item.id });
  currentLocale = item.id;
  $("locale-label").textContent = item.label;
  renderChoiceMenu("locale-menu", availableLocales, item.id, selectLocale);
  toast("Reply language saved for the CLI and desktop app.");
}

const modelProviderLabels = { voxiva: "Voxiva · Free", opencode: "OpenCode Zen", openai: "OpenAI", anthropic: "Anthropic", google: "Google AI", deepseek: "DeepSeek", groq: "Groq", openrouter: "OpenRouter" };
function modelProvider(ref) { return ref.split("/")[0] || "Other"; }
async function openProviderSettings(providerId) {
  $("model-menu").hidePopover();
  await loadState();
  $("settings-dialog").showModal();
  const card = $("provider-list").querySelector(`[data-provider-id="${providerId}"]`);
  card?.scrollIntoView({ block: "nearest" });
  card?.querySelector("input")?.focus();
}
function renderModelPicker() {
  const selected = availableModels.find((model) => model.ref === selectedModelRef);
  $("model-trigger-label").textContent = selected?.label ?? "Подключите модель";
  $("model-trigger").disabled = availableModels.length === 0;
  $("model-caption").textContent = selected?.label ?? "Connect a model";
  const query = $("model-search").value.trim().toLocaleLowerCase();
  const filtered = availableModels.filter((model) => `${model.label} ${model.ref} ${modelProvider(model.ref)}`.toLocaleLowerCase().includes(query));
  const filteredProviders = availableProviders.filter((provider) => `${provider.label} ${provider.id}`.toLocaleLowerCase().includes(query));
  const options = $("model-options");
  options.replaceChildren();
  const groups = new Map();
  for (const model of filtered) {
    const provider = modelProvider(model.ref);
    if (!groups.has(provider)) groups.set(provider, []);
    groups.get(provider).push(model);
  }
  for (const [provider, models] of groups) {
    const group = document.createElement("section");
    group.className = "model-group";
    const heading = document.createElement("div");
    heading.className = "model-group-heading";
    heading.textContent = modelProviderLabels[provider] ?? provider;
    group.append(heading);
    for (const model of models) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "model-option" + (model.ref === selectedModelRef ? " selected" : "");
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", String(model.ref === selectedModelRef));
      const label = document.createElement("span");
      label.className = "model-option-name";
      label.textContent = model.label;
      button.append(label);
      if (provider === "voxiva") {
        const free = document.createElement("small");
        free.className = "model-free-badge";
        free.textContent = "Бесплатно";
        button.append(free);
      }
      if (model.ref === selectedModelRef) {
        const check = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        check.setAttribute("viewBox", "0 0 16 16");
        check.setAttribute("aria-hidden", "true");
        check.innerHTML = "<path d=\"m3 8 3.2 3.2L13 4.8\"/>";
        button.append(check);
      }
      button.addEventListener("click", () => chooseModel(model.ref));
      group.append(button);
    }
    options.append(group);
  }
  if (!filtered.length) {
    const empty = document.createElement("div");
    empty.className = "model-empty";
    empty.textContent = "Модели не найдены";
    options.append(empty);
  }
  if (filteredProviders.length) {
    const heading = document.createElement("div");
    heading.className = "model-group-heading model-provider-heading";
    heading.textContent = "Провайдеры";
    options.append(heading);
    for (const provider of filteredProviders) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "model-option model-provider-option";
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", "false");
      const name = document.createElement("span");
      name.className = "model-option-name";
      name.textContent = provider.label;
      const status = document.createElement("small");
      status.className = "model-provider-status" + (provider.connected ? " connected" : "");
      status.textContent = provider.connected ? "Подключён" : "Добавить ключ";
      button.append(name, status);
      button.addEventListener("click", () => openProviderSettings(provider.id).catch((error) => toast(error.message)));
      options.append(button);
    }
  }
}

function positionModelMenu() {
  const menu = $("model-menu");
  const trigger = $("model-trigger").getBoundingClientRect();
  const margin = 10;
  const gap = 6;
  const width = Math.min(340, innerWidth - margin * 2);
  menu.style.width = `${width}px`;
  menu.style.height = "auto";
  menu.style.maxHeight = "none";
  const naturalHeight = Math.min(420, menu.getBoundingClientRect().height);
  const below = Math.max(0, innerHeight - trigger.bottom - gap - margin);
  const above = Math.max(0, trigger.top - gap - margin);
  const openAbove = below < naturalHeight && above > below;
  const height = Math.min(naturalHeight, openAbove ? above : below);
  menu.style.left = `${Math.max(margin, Math.min(trigger.left, innerWidth - width - margin))}px`;
  menu.style.maxHeight = `${height}px`;
  menu.style.top = `${openAbove ? trigger.top - gap - height : trigger.bottom + gap}px`;
}

async function chooseModel(ref) {
  try {
    await window.voxiva.setModel(ref);
    selectedModelRef = ref;
    renderModelPicker();
    $("model-menu").hidePopover();
    $("model-trigger").focus();
    $("status-meta").textContent = `${$("plan-chip-label").textContent} · ${availableModels.find((model) => model.ref === ref)?.label ?? "Voxiva"}`;
  } catch (error) { toast(error instanceof Error ? error.message : String(error)); await loadState(); }
}

function renderProviders(providers) {
  const list = $("provider-list");
  if (!list) return;
  list.replaceChildren();
  for (const provider of providers) {
    const card = document.createElement("section");
    card.className = "provider-card";
    card.dataset.providerId = provider.id;
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
$("open-project").addEventListener("click", chooseProject);
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
$("nav-chat").addEventListener("click", () => startNewChat().catch((error) => toast(error.message)));
$("sidebar-toggle").addEventListener("click", () => {
  const open = !document.body.classList.contains("sidebar-open");
  setSidebar(open);
});
function setSidebar(open) {
  document.body.classList.toggle("sidebar-open", open);
  $("sidebar").inert = !open;
  $("sidebar-toggle").title = open ? "Hide sidebar" : "Show sidebar";
  $("sidebar-toggle").setAttribute("aria-label", $("sidebar-toggle").title);
  localStorage.setItem("voxiva-sidebar", open ? "expanded" : "collapsed");
}
async function startNewChat() {
  await stopCurrentResponse();
  currentSessionId = await window.voxiva.newChat();
  currentSessionTitle = "New session";
  currentDraft = true;
  openTabs = openTabs.filter((tab) => tab.id !== null);
  openTabs.push({ id: null, title: currentSessionTitle });
  renderTabs();
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
  const hasBadge = status.available && Boolean(status.asset);
  $("update-trigger").hidden = !hasBadge;
  if (!status.available) {
    currentUpdate = null;
    if (!silent) toast(!status.latest ? "Could not reach GitHub. Try again later." : !status.releaseReady ? "The latest release does not include a desktop installer yet." : "Voxiva is up to date.");
    return;
  }
  currentUpdate = status;
  $("update-trigger").title = `Voxiva ${status.latest} update available`;
  $("update-trigger").setAttribute("aria-label", `Voxiva ${status.latest} update available`);
  if (!silent) showUpdateDialog(status);
}
function showUpdateDialog(status) {
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
    if (["models", "connect", "settings", "theme"].includes(id)) {
      await loadState();
      $("settings-dialog").showModal();
      if (id === "theme") toggleChoiceMenu("theme-choice", "theme-menu");
      return;
    }
    if (id === "plans") { toggleChoiceMenu("plan-chip", "plan-menu"); return; }
    if (id === "sessions") { setSidebar(true); $("session-list").scrollIntoView({ block: "nearest" }); return; }
    if (id === "workspaces") return openWorkspacePicker();
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
    if (id === "sidebar") return $("sidebar-toggle").click();
    if (id === "commands") return openCommands();
    if (["undo", "redo", "select-all"].includes(id)) {
      $("prompt").focus();
      if (id === "select-all") return $("prompt").select();
      return document.execCommand(id);
    }
    if (id === "copy") return navigator.clipboard.writeText(document.getSelection()?.toString() || $("prompt").value);
    if (id === "paste") return navigator.clipboard.readText().then((text) => {
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) document.execCommand("insertText", false, text);
      else { $("prompt").value += text; $("prompt").dispatchEvent(new Event("input", { bubbles: true })); }
    });
  } catch (error) { toast(error instanceof Error ? error.message : String(error)); }
}
$("app-menu-trigger").addEventListener("click", () => {
  if ($("app-menu").matches(":popover-open")) { $("app-menu").hidePopover(); return; }
  showPopover("app-menu", $("app-menu-trigger"));
});
$("app-menu").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  $("app-menu").hidePopover();
  if (button.dataset.action === "new") return startNewChat();
  if (["workspaces", "update", "doctor", "sidebar", "theme", "commands", "undo", "redo", "copy", "paste", "select-all"].includes(button.dataset.action)) runCommand(button.dataset.action).catch((error) => toast(error.message));
});
$("composer-project").addEventListener("click", async () => {
  try { await renderProjectOptions(); showPopover("project-menu", $("composer-project")); $("project-search").focus(); }
  catch (error) { toast(error instanceof Error ? error.message : String(error)); }
});
$("project-search").addEventListener("input", () => renderProjectOptions().catch((error) => toast(error.message)));
$("project-add").addEventListener("click", () => { $("project-menu").hidePopover(); chooseProject(); });
$("environment-trigger").addEventListener("click", () => showPopover("environment-menu", $("environment-trigger")));
$("environment-local").addEventListener("click", async () => {
  $("environment-menu").hidePopover();
  try {
    const main = await window.voxiva.mainWorktree(currentProject);
    if (!sameProjectPath(main, currentProject)) await activateProject(main);
    else $("environment-label").textContent = "Локальный репозиторий";
  } catch (error) { toast(error instanceof Error ? error.message : String(error)); }
});
$("environment-worktree").addEventListener("click", () => {
  if (!currentProject) { toast("Сначала выберите проект."); return; }
  $("worktree-form").hidden = false;
  $("worktree-name").focus();
});
$("worktree-form").addEventListener("submit", createProjectWorktree);
$("tab-new").addEventListener("click", () => startNewChat().catch((error) => toast(error.message)));
$("update-trigger").addEventListener("click", () => currentUpdate && showUpdateDialog(currentUpdate));
$("app-menu").addEventListener("toggle", (event) => $("app-menu-trigger").setAttribute("aria-expanded", String(event.newState === "open")));
$("project-menu").addEventListener("toggle", (event) => $("composer-project").setAttribute("aria-expanded", String(event.newState === "open")));
$("environment-menu").addEventListener("toggle", (event) => $("environment-trigger").setAttribute("aria-expanded", String(event.newState === "open")));
$("settings-button").addEventListener("click", () => {
  loadState().then(() => $("settings-dialog").showModal()).catch((error) => toast(error.message));
});
$("settings-close").addEventListener("click", () => $("settings-dialog").close());
$("settings-done").addEventListener("click", () => $("settings-dialog").close());
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
$("workspace-button").addEventListener("click", () => openWorkspacePicker($("workspace-button")));
$("new-session-button").addEventListener("click", () => startNewChat().catch((error) => toast(error.message)));
$("model-trigger").addEventListener("click", () => {
  const menu = $("model-menu");
  if (menu.matches(":popover-open")) { menu.hidePopover(); return; }
  renderModelPicker();
  menu.showPopover();
  positionModelMenu();
  $("model-search").focus();
});
$("model-search").addEventListener("input", () => { renderModelPicker(); positionModelMenu(); });
$("model-menu").addEventListener("toggle", (event) => {
  const open = event.newState === "open";
  $("model-trigger").setAttribute("aria-expanded", String(open));
  if (!open) { $("model-search").value = ""; renderModelPicker(); }
});
$("model-menu").addEventListener("keydown", (event) => {
  if (event.key === "Escape") { event.preventDefault(); $("model-menu").hidePopover(); $("model-trigger").focus(); }
  if (event.target === $("model-search") && event.key === "ArrowDown") { event.preventDefault(); $("model-options").querySelector(".model-option")?.focus(); }
  if (event.target.matches(".model-option") && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
    event.preventDefault();
    const options = [...$("model-options").querySelectorAll(".model-option")];
    const index = options.indexOf(event.target);
    options[(index + (event.key === "ArrowDown" ? 1 : options.length - 1)) % options.length]?.focus();
  }
});
$("model-manage").addEventListener("click", async () => {
  $("model-menu").hidePopover();
  await loadState();
  $("settings-dialog").showModal();
});
window.addEventListener("resize", () => { if ($("model-menu").matches(":popover-open")) positionModelMenu(); });
window.addEventListener("resize", () => {
  for (const [triggerId, menuId] of choiceMenus) {
    const menu = $(menuId);
    if (menu.matches(":popover-open")) positionPopover(menu, $(triggerId));
  }
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
  assistantStream.clear();
  currentAssistant.content.textContent = text;
  currentAssistant.content.classList.remove("thinking");
  currentSessionId = sessionId ?? currentSessionId;
  currentSessionTitle = title || currentSessionTitle;
  if (currentSessionId) {
    if (currentDraft) {
      currentDraft = false;
      const draft = openTabs.find((tab) => tab.id === null);
      if (draft) { draft.id = currentSessionId; draft.title = currentSessionTitle; }
    }
    rememberTab(currentSessionId, currentSessionTitle);
  }
  $("view-title").textContent = currentSessionTitle;
  loadSessions().catch((error) => toast(error.message));
});
window.voxiva.onChunk((chunk) => {
  if (!currentAssistant) return;
  assistantStream.push(chunk);
});
window.voxiva.onReset((message) => {
  if (!currentAssistant) return;
  assistantStream.clear();
  currentAssistant.content.textContent = message;
  currentAssistant.content.classList.add("thinking");
});
window.voxiva.onEdits((proposal) => renderProposal(proposal));
window.voxiva.onSessionChanged(() => loadSessions().catch((error) => toast(error.message)));
window.voxiva.onWarning((message) => toast(message));
document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === "n") { event.preventDefault(); startNewChat(); }
});

renderTabs();
await loadState();
const initialProject = await window.voxiva.initialProject();
if (initialProject) {
  setProject(initialProject);
  await loadSessions();
  const lastSession = await window.voxiva.lastSession(initialProject);
  if (lastSession) await openSession(lastSession);
}
checkDesktopUpdate({ silent: true }).catch(() => {});
