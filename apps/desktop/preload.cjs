const { app, contextBridge, ipcRenderer } = require("electron");
const { pathToFileURL } = require("node:url");

const logoPath = app.isPackaged
  ? `${process.resourcesPath}/voxiva-mark.svg`
  : `${__dirname}/../../brand/voxiva-mark.svg`;

function subscribe(channel, callback) {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("voxiva", {
  logoUrl: pathToFileURL(logoPath).href,
  initialProject: () => ipcRenderer.invoke("project:initial"),
  chooseProject: () => ipcRenderer.invoke("project:choose"),
  state: () => ipcRenderer.invoke("app:state"),
  setModel: (ref) => ipcRenderer.invoke("app:model", ref),
  setPlan: (id) => ipcRenderer.invoke("app:plan", id),
  newChat: () => ipcRenderer.invoke("chat:new"),
  sendChat: (prompt) => ipcRenderer.invoke("chat:send", prompt),
  stopChat: () => ipcRenderer.invoke("chat:stop"),
  applyEdits: (id) => ipcRenderer.invoke("chat:apply", id),
  discardEdits: (id) => ipcRenderer.invoke("chat:discard", id),
  start: (cwd) => ipcRenderer.invoke("terminal:start", cwd),
  write: (data) => ipcRenderer.send("terminal:write", data),
  resize: (cols, rows) => ipcRenderer.send("terminal:resize", cols, rows),
  onData: (callback) => subscribe("terminal:data", callback),
  onExit: (callback) => subscribe("terminal:exit", callback),
  onReply: (callback) => subscribe("chat:reply", callback),
  onChunk: (callback) => subscribe("chat:chunk", callback),
  onReset: (callback) => subscribe("chat:reset", callback),
  onEdits: (callback) => subscribe("chat:edits", callback),
});
