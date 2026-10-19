const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const pty = require("node-pty");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createOutputFilter } = require("./output-filter.cjs");

let window;
let terminal;
let activeRequest;
let conversation = [];
let pendingEdits = new Map();
let corePromise;
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

function cliEntry() {
  return path.join(app.isPackaged ? path.join(process.resourcesPath, "app.asar.unpacked") : app.getAppPath(), "node_modules", "@voxiva", "cli", "dist", "index.js");
}

function cliRoot() {
  return path.dirname(path.dirname(cliEntry()));
}

function core() {
  if (!corePromise) {
    const root = cliRoot();
    const load = (name) => import(pathToFileURL(path.join(root, name)).href);
    corePromise = Promise.all([
      load("providers/chat.js"), load("config/store.js"), load("plans/index.js"),
      load("project/files.js"), load("project/edits.js"),
    ]).then(([chat, config, plans, files, edits]) => ({ chat, config, plans, files, edits }));
  }
  return corePromise;
}

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
  saveProject(cwd);
  return cwd;
});

ipcMain.handle("project:initial", () => {
  const cwd = loadSettings().lastProject;
  return typeof cwd === "string" && fs.existsSync(cwd) ? cwd : null;
});

ipcMain.handle("app:state", async () => {
  const { chat, config, plans } = await core();
  const saved = await config.loadConfig();
  const auth = await config.loadAuth();
  const usable = chat.listCatalog().filter((model) => chat.isUsableModelRef(chat.modelRef(model), auth));
  const models = [...new Map(usable.map((model) => [chat.modelRef(model), { ref: chat.modelRef(model), label: model.label }])).values()];
  if (saved.defaultModel && chat.isUsableModelRef(saved.defaultModel, auth) && !models.some((model) => model.ref === saved.defaultModel)) {
    models.unshift({ ref: saved.defaultModel, label: saved.defaultModel });
  }
  if (!models.some((model) => model.ref === saved.defaultModel)) {
    const fallback = chat.modelRef(chat.listFreeCatalog(auth)[0]);
    if (fallback && !models.some((model) => model.ref === fallback)) models.unshift({ ref: fallback, label: "Anonymous free fallback" });
  }
  return { models, model: saved.defaultModel ?? chat.DEFAULT_FREE_MODEL, plan: saved.plan, plans: plans.PLANS.map(({ id, label, description }) => ({ id, label, description })) };
});

ipcMain.handle("app:model", async (_event, ref) => {
  const { chat, config } = await core();
  const auth = await config.loadAuth();
  if (typeof ref !== "string" || !chat.isUsableModelRef(ref, auth)) throw new Error("This model is unavailable. Connect its provider in the terminal with /connect.");
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
  pendingEdits.clear();
  return true;
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
  if (!chat.isUsableModelRef(model, auth)) throw new Error("The selected model is not available. Connect its provider in the terminal.");
  const controller = new AbortController();
  activeRequest = controller;
  conversation.push({ role: "user", content: prompt.trim() });
  const plan = saved.plan ?? "build";
  const messages = [{ role: "system", content: await plans.planSystemAsync(plan, saved.locale ?? "en", cwd) }, ...conversation];
  let reply = "";
  let readLimitReached = false;
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
    if (controller.signal.aborted) return { stopped: true };
    const blocks = edits.extractFileBlocks(reply);
    const text = files.stripReadBlocks(edits.stripFileBlocks(reply));
    conversation.push({ role: "assistant", content: text });
    if (conversation.length > 40) conversation = conversation.slice(-40);
    let proposed = [];
    if (blocks.length && plans.getPlan(plan).allowEdits) {
      proposed = await edits.prepareEdits(cwd, blocks);
      const id = require("node:crypto").randomUUID();
      pendingEdits.set(id, { cwd, proposed });
      send("chat:edits", { id, files: proposed.map(({ path, action, preview, exists }) => ({ path, action, preview, exists })) });
    }
    send("chat:reply", { text: text || (readLimitReached ? "I couldn't finish reading the requested files. Try again with a narrower request." : "No response received."), files: proposed.map(({ path }) => path) });
    return { ok: true };
  } catch (error) {
    if (!controller.signal.aborted) {
      if (conversation.at(-1)?.role === "user" && conversation.at(-1)?.content === prompt.trim()) conversation.pop();
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
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
