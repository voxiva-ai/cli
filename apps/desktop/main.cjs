const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const pty = require("node-pty");
const fs = require("node:fs");
const path = require("node:path");

let window;
let terminal;
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
