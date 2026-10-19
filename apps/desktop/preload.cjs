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
  start: (cwd) => ipcRenderer.invoke("terminal:start", cwd),
  write: (data) => ipcRenderer.send("terminal:write", data),
  resize: (cols, rows) => ipcRenderer.send("terminal:resize", cols, rows),
  onData: (callback) => subscribe("terminal:data", callback),
  onExit: (callback) => subscribe("terminal:exit", callback),
});
