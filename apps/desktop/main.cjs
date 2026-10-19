const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require("electron");
const { spawnSync } = require("node:child_process");
const pty = require("node-pty");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createOutputFilter } = require("./output-filter.cjs");
const { createProviderHandlers } = require("./provider-service.cjs");
const { createSessionHandlers } = require("./session-service.cjs");
const { createAppActions } = require("./app-actions.cjs");
const { createUpdateService } = require("./update-service.cjs");

let window;
let terminal;
let activeRequest;
let conversation = [];
let activeSessionId;
let pendingEdits = new Map();
let corePromise;
let providerHandlersPromise;
let appActionsPromise;
let downloadedUpdate;
let updateController;
let updateService;
const settingsPath = () => path.join(app.getPath("userData"), "settings.json");

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
  } catch {
    return {};
  }
}

function saveProject(cwd) {
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify({ lastProject: cwd }, null, 2));
}

function samePath(left, right) {
  const normalize = (value) => {
    const resolved = path.resolve(value);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
}

function clearProjectState(nextCwd) {
  const current = loadSettings().lastProject;
  if (typeof current !== "string" || samePath(current, nextCwd)) return;
  activeRequest?.abort();
  stopTerminal();
  conversation = [];
  activeSessionId = undefined;
  pendingEdits.clear();
}

function cliEntry() {
  return path.join(app.isPackaged ? path.join(process.resourcesPath, "app.asar.unpacked") : app.getAppPath(), "node_modules", "@voxiva", "cli", "dist", "index.js");
}

function cliRoot() {
  return path.dirname(cliEntry());
}

function core() {
  if (!corePromise) {
    const root = cliRoot();
    const load = (name) => import(pathToFileURL(path.join(root, name)).href);
    corePromise = Promise.all([
      load("providers/chat.js"), load("config/store.js"), load("plans/index.js"),
      load("project/files.js"), load("project/edits.js"),
      load("sessions/store.js"), load("workspaces/store.js"),
    ]).then(([chat, config, plans, files, edits, sessions, workspaces]) => ({ chat, config, plans, files, edits, sessions, workspaces }));
  }
  return corePromise;
}

function providerHandlers() {
  if (!providerHandlersPromise) {
    providerHandlersPromise = core().then(({ config }) => createProviderHandlers({
      loadAuth: config.loadAuth,
      saveAuth: config.saveAuth,
      providerIds: config.PROVIDER_IDS,
    }));
  }
  return providerHandlersPromise;
}

function appActions() {
  if (!appActionsPromise) appActionsPromise = core().then(({ chat, config }) => import(pathToFileURL(path.join(cliRoot(), "tui/themes.js")).href).then(({ THEMES }) => import(pathToFileURL(path.join(cliRoot(), "i18n/index.js")).href).then(({ LOCALES }) => createAppActions({
    config,
    themes: THEMES,
    locales: LOCALES,
    getStatus: async () => {
      const saved = await config.loadConfig();
      const auth = await config.loadAuth();
      const usable = chat.isUsableModelRef(saved.defaultModel ?? chat.DEFAULT_FREE_MODEL, auth);
      const update = await updates().check().catch(() => null);
      return {
        runtime: process.versions.node,
        model: saved.defaultModel ?? chat.DEFAULT_FREE_MODEL,
        modelReady: usable,
        providers: Object.keys(auth).filter((id) => auth[id]?.apiKey),
        project: loadSettings().lastProject ?? null,
        update: update?.available ? `v${update.latest} available` : update?.latest ? (update.releaseReady ? `Up to date (v${update.current})` : `No desktop installer for v${update.latest} yet`) : "GitHub check unavailable",
      };
    },
  }))));
  return appActionsPromise;
}

const updates = () => (updateService ??= createUpdateService({ currentVersion: app.getVersion() }));

function nodeRuntime() {
  return path.join(app.isPackaged ? path.join(process.resourcesPath, "app.asar.unpacked") : app.getAppPath(), "node_modules", "node", "bin", process.platform === "win32" ? "node.exe" : "node");
}

function stopTerminal() {
  if (!terminal) return;
  terminal.kill();
  terminal = undefined;
}

function createWindow() {
  window = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 760,
    minHeight: 540,
    backgroundColor: "#090c11",
    title: "Voxiva CLI",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.loadFile(path.join(__dirname, "index.html"));
  window.on("closed", () => {
    activeRequest?.abort();
    stopTerminal();
    window = undefined;
  });
}

ipcMain.handle("project:choose", async () => {
  const result = await dialog.showOpenDialog(window, {
    title: "Open a project folder",
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const cwd = fs.realpathSync(result.filePaths[0]);
  clearProjectState(cwd);
  saveProject(cwd);
  const { config, workspaces } = await core();
  await workspaces.touchWorkspace(cwd);
  await config.patchConfig({ cwd });
  return cwd;
});

ipcMain.handle("project:initial", async () => {
  const { config, workspaces } = await core();
  const saved = await config.loadConfig();
  const recent = await workspaces.listWorkspaces();
  const candidates = [loadSettings().lastProject, saved.cwd, recent[0]?.path];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !fs.existsSync(candidate)) continue;
    try {
      const cwd = fs.realpathSync(candidate);
      if (!fs.statSync(cwd).isDirectory()) continue;
      saveProject(cwd);
      await workspaces.touchWorkspace(cwd);
      await config.patchConfig({ cwd });
      return cwd;
    } catch {}
  }
  return null;
});

ipcMain.handle("workspace:list", async () => {
  const { workspaces } = await core();
  return (await workspaces.listWorkspaces()).map(({ path: folder, title, updatedAt }) => ({ path: folder, title, updatedAt }));
});

ipcMain.handle("workspace:last-session", async (_event, cwd) => {
  if (typeof cwd !== "string") return null;
  const { workspaces } = await core();
  return (await workspaces.getWorkspace(cwd))?.lastSessionId ?? null;
});

ipcMain.handle("workspace:activate", async (_event, requestedPath) => {
  if (typeof requestedPath !== "string") throw new Error("Choose a recent project.");
  const { config, workspaces } = await core();
  const selected = (await workspaces.listWorkspaces()).find((item) => samePath(item.path, requestedPath));
  if (!selected) throw new Error("This project is no longer available. Choose a folder again.");
  const cwd = fs.realpathSync(selected.path);
  if (!fs.statSync(cwd).isDirectory()) throw new Error("The selected project path is not a folder.");
  clearProjectState(cwd);
  saveProject(cwd);
  await workspaces.touchWorkspace(cwd);
  await config.patchConfig({ cwd });
  return cwd;
});

ipcMain.handle("project:branch", (_event, cwd) => {
  if (typeof cwd !== "string") return null;
  try {
    const result = spawnSync("git", ["branch", "--show-current"], { cwd, encoding: "utf8", timeout: 1500, windowsHide: true });
    return result.status === 0 ? result.stdout.trim() || null : null;
  } catch {
    return null;
  }
});

ipcMain.handle("project:context-file", async () => {
  const cwd = loadSettings().lastProject;
  if (!cwd || !fs.existsSync(cwd)) throw new Error("Choose a project folder first.");
  const result = await dialog.showOpenDialog(window, { title: "Add a project file", defaultPath: cwd, properties: ["openFile"] });
  if (result.canceled || !result.filePaths[0]) return null;
  const root = fs.realpathSync(cwd);
  const file = fs.realpathSync(result.filePaths[0]);
  const relative = path.relative(root, file);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("Choose a file inside the current project.");
  }
  if (!fs.statSync(file).isFile()) throw new Error("Choose a regular file.");
  return relative.split(path.sep).join("/");
});

ipcMain.handle("app:state", async () => {
  const { chat, config, plans } = await core();
  const saved = await config.loadConfig();
  const auth = await config.loadAuth();
  const providers = await (await providerHandlers()).state(auth);
  const usable = chat.listCatalog().filter((model) => chat.isUsableModelRef(chat.modelRef(model), auth));
  const models = [...new Map(usable.map((model) => [chat.modelRef(model), { ref: chat.modelRef(model), label: model.label }])).values()];
  if (saved.defaultModel && chat.isUsableModelRef(saved.defaultModel, auth) && !models.some((model) => model.ref === saved.defaultModel)) {
    models.unshift({ ref: saved.defaultModel, label: saved.defaultModel });
  }
  if (!models.some((model) => model.ref === saved.defaultModel)) {
    const fallback = chat.modelRef(chat.listFreeCatalog(auth)[0]);
    if (fallback && !models.some((model) => model.ref === fallback)) models.unshift({ ref: fallback, label: "Anonymous free fallback" });
  }
  return {
    models,
    model: saved.defaultModel ?? chat.DEFAULT_FREE_MODEL,
    plan: saved.plan,
    plans: plans.PLANS.map(({ id, label, description }) => ({ id, label, description })),
    providers,
    theme: saved.theme ?? "auto",
    locale: saved.locale ?? "en",
  };
});

ipcMain.handle("app:preferences", async () => (await appActions()).preferences());
ipcMain.handle("app:set-preferences", async (_event, input) => (await appActions()).setPreferences(input));
ipcMain.handle("app:doctor", async () => (await appActions()).doctor());
ipcMain.handle("app:commands", async () => (await appActions()).commands());
ipcMain.handle("app:options", async () => (await appActions()).options());
ipcMain.handle("update:check", async () => (await updates()).check());
ipcMain.handle("update:open-release", async () => {
  const status = await (await updates()).check();
  await shell.openExternal(status.releaseUrl);
  return true;
});
ipcMain.handle("update:download", async (event) => {
  if (updateController) throw new Error("An update download is already running.");
  const controller = new AbortController();
  updateController = controller;
  try {
    downloadedUpdate = await (await updates()).download({
      directory: path.join(app.getPath("downloads"), "Voxiva Updates"),
      signal: controller.signal,
      onProgress: (progress) => { if (!event.sender.isDestroyed()) event.sender.send("update:progress", progress); },
    });
    return downloadedUpdate;
  } finally {
    if (updateController === controller) updateController = undefined;
  }
});
ipcMain.handle("update:cancel", () => { updateController?.abort(); return true; });
ipcMain.handle("update:open", async () => {
  if (!downloadedUpdate?.path || !fs.existsSync(downloadedUpdate.path)) throw new Error("Download the update before opening it.");
  const error = await shell.openPath(downloadedUpdate.path);
  if (error) throw new Error(error);
  return true;
});

ipcMain.handle("provider:state", async () => (await providerHandlers()).state());
ipcMain.handle("provider:save", async (_event, input) => (await providerHandlers()).save(input));
ipcMain.handle("provider:remove", async (_event, id) => (await providerHandlers()).remove(id));

ipcMain.handle("session:list", async () => {
  const { sessions } = await core();
  return createSessionHandlers({ sessions, getCurrentProject: () => loadSettings().lastProject }).list();
});

ipcMain.handle("session:open", async (_event, id) => {
  const { chat, config, plans, sessions, workspaces } = await core();
  const handlers = createSessionHandlers({ sessions, getCurrentProject: () => loadSettings().lastProject });
  const record = await handlers.open(id);
  const auth = await config.loadAuth();
  const modelAvailable = Boolean(record.model && chat.isUsableModelRef(record.model, auth));
  if (modelAvailable) await config.rememberModel(record.model);
  const plan = plans.PLANS.some((item) => item.id === record.plan) ? record.plan : undefined;
  if (plan) await config.patchConfig({ plan });
  const cwd = loadSettings().lastProject;
  activeRequest?.abort();
  activeSessionId = record.id;
  conversation = record.messages;
  pendingEdits.clear();
  const saved = await config.loadConfig();
  await config.patchConfig({ cwd, lastSessionId: record.id });
  await workspaces.touchWorkspace(cwd, {
    lastSessionId: record.id,
    lastModel: modelAvailable ? record.model : saved.defaultModel,
    lastPlan: plan ?? saved.plan,
  });
  return { ...record, modelAvailable };
});

ipcMain.handle("app:model", async (_event, ref) => {
  const { chat, config } = await core();
  const auth = await config.loadAuth();
  if (typeof ref !== "string" || !chat.isUsableModelRef(ref, auth)) throw new Error("This model is unavailable. Connect its provider in Settings.");
  await config.rememberModel(ref);
  return ref;
});

ipcMain.handle("app:plan", async (_event, id) => {
  const { config, plans } = await core();
  if (!plans.PLANS.some((plan) => plan.id === id)) throw new Error("Unknown agent plan.");
  await config.patchConfig({ plan: id });
  return id;
});

ipcMain.handle("chat:new", () => {
  activeRequest?.abort();
  conversation = [];
  activeSessionId = require("node:crypto").randomUUID();
  pendingEdits.clear();
  return activeSessionId;
});

ipcMain.handle("chat:send", async (event, prompt) => {
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 20_000) throw new Error("Enter a message under 20,000 characters.");
  const cwd = loadSettings().lastProject;
  if (!cwd || !fs.existsSync(cwd)) throw new Error("Choose a project folder first.");
  const { chat, config, plans, files, edits } = await core();
  const send = (channel, value) => { if (!event.sender.isDestroyed()) event.sender.send(channel, value); };
  const saved = await config.loadConfig();
  const auth = await config.loadAuth();
  const model = chat.migrateModelRef(saved.defaultModel) ?? chat.DEFAULT_FREE_MODEL;
  if (!chat.isUsableModelRef(model, auth)) throw new Error("The selected model is not available. Connect its provider in Settings.");
  activeRequest?.abort();
  const controller = new AbortController();
  activeRequest = controller;
  const requestConversation = conversation;
  const sessionId = activeSessionId ?? (activeSessionId = require("node:crypto").randomUUID());
  requestConversation.push({ role: "user", content: prompt.trim() });
  const plan = saved.plan ?? "build";
  const messages = [{ role: "system", content: await plans.planSystemAsync(plan, saved.locale ?? "en", cwd) }, ...requestConversation];
  let reply = "";
  let readLimitReached = false;
  let savedSession;
  try {
    for (let round = 0; round < 3; round++) {
      const outputFilter = createOutputFilter();
      const show = (text) => { if (text) send("chat:chunk", text); };
      reply = await chat.streamChat(auth, model, messages, {
        signal: controller.signal,
        onToken: (chunk) => { reply += chunk; show(outputFilter.push(chunk)); },
      });
      const requested = files.extractReadPaths(reply);
      if (requested.length && round < 2 && !controller.signal.aborted) {
        send("chat:reset", "Reading project files…");
        messages.push({ role: "assistant", content: reply }, { role: "user", content: await files.readRequestedFiles(cwd, requested) });
        reply = "";
        continue;
      }
      readLimitReached = requested.length > 0;
      show(outputFilter.finish());
      break;
    }
    if (controller.signal.aborted) {
      if (requestConversation.at(-1)?.role === "user" && requestConversation.at(-1)?.content === prompt.trim()) requestConversation.pop();
      return { stopped: true };
    }
    const blocks = edits.extractFileBlocks(reply);
    const text = files.stripReadBlocks(edits.stripFileBlocks(reply));
    requestConversation.push({ role: "assistant", content: text });
    if (requestConversation.length > 40) requestConversation.splice(0, requestConversation.length - 40);
    conversation = requestConversation;
    try {
      const sessionHandlers = createSessionHandlers({ sessions: (await core()).sessions, getCurrentProject: () => cwd });
      savedSession = await sessionHandlers.save({ id: sessionId, plan, model, messages: requestConversation });
      const { config, workspaces } = await core();
      await config.patchConfig({ cwd, lastSessionId: sessionId });
      await workspaces.touchWorkspace(cwd, { lastSessionId: sessionId, lastModel: model, lastPlan: plan });
      if (!event.sender.isDestroyed()) event.sender.send("session:changed");
    } catch {
      send("chat:warning", "The reply arrived, but this session could not be saved.");
    }
    let proposed = [];
    if (blocks.length && plans.getPlan(plan).allowEdits) {
      proposed = await edits.prepareEdits(cwd, blocks);
      if (controller.signal.aborted) return { stopped: true };
      const id = require("node:crypto").randomUUID();
      pendingEdits.set(id, { cwd, proposed });
      send("chat:edits", { id, files: proposed.map(({ path, action, preview, exists }) => ({ path, action, preview, exists })) });
    }
    send("chat:reply", { text: text || (readLimitReached ? "I couldn't finish reading the requested files. Try again with a narrower request." : "No response received."), files: proposed.map(({ path }) => path), sessionId, title: savedSession?.title });
    return { ok: true };
  } catch (error) {
    if (!controller.signal.aborted) {
      if (requestConversation.at(-1)?.role === "user" && requestConversation.at(-1)?.content === prompt.trim()) requestConversation.pop();
      throw error;
    }
    return { stopped: true };
  } finally {
    if (activeRequest === controller) activeRequest = undefined;
  }
});

ipcMain.handle("chat:stop", () => { activeRequest?.abort(); return true; });

ipcMain.handle("chat:apply", async (_event, id) => {
  const pending = pendingEdits.get(id);
  if (!pending) throw new Error("This file proposal has expired. Ask Voxiva to generate it again.");
  const { edits } = await core();
  const applied = await edits.applyEdits(pending.cwd, pending.proposed);
  pendingEdits.delete(id);
  return applied;
});

ipcMain.handle("chat:discard", (_event, id) => pendingEdits.delete(id));

ipcMain.handle("terminal:start", (_event, requestedCwd) => {
  if (typeof requestedCwd !== "string") throw new Error("Choose a project folder first.");
  const cwd = fs.realpathSync(requestedCwd);
  if (!fs.statSync(cwd).isDirectory()) throw new Error("The selected project path is not a folder.");
  stopTerminal();
  saveProject(cwd);
  try {
    const child = pty.spawn(nodeRuntime(), [cliEntry(), "chat"], {
      name: "xterm-256color",
      cwd,
      cols: 100,
      rows: 30,
      env: { ...process.env, FORCE_COLOR: "1" },
    });
    terminal = child;
    child.onData((data) => window?.webContents.send("terminal:data", data));
    child.onExit(({ exitCode }) => {
      if (terminal !== child) return;
      terminal = undefined;
      window?.webContents.send("terminal:exit", exitCode);
    });
    return { cwd };
  } catch (error) {
    terminal = undefined;
    throw new Error(error instanceof Error ? error.message : String(error));
  }
});

ipcMain.on("terminal:write", (_event, data) => {
  if (typeof data === "string") terminal?.write(data);
});

ipcMain.on("terminal:resize", (_event, cols, rows) => {
  if (!terminal) return;
  const width = Math.max(2, Math.min(500, Math.floor(Number(cols) || 2)));
  const height = Math.max(2, Math.min(300, Math.floor(Number(rows) || 2)));
  terminal.resize(width, height);
});

app.whenReady().then(() => {
  if (process.platform === "win32") Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
