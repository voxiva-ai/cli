const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, callback) {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("voxiva", {
  initialProject: () => ipcRenderer.invoke("project:initial"),
  chooseProject: () => ipcRenderer.invoke("project:choose"),
  chooseContextFile: () => ipcRenderer.invoke("project:context-file"),
  branch: (cwd) => ipcRenderer.invoke("project:branch", cwd),
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
