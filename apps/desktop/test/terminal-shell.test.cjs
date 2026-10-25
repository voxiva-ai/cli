const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const main = fs.readFileSync(path.join(__dirname, "../main.cjs"), "utf8");
const renderer = fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8");
const { createShellConfig, writeCliLauncher } = require("../terminal-shell.cjs");

test("Windows terminal exposes the bundled CLI through voxiva.cmd", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "voxiva-shell-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const result = writeCliLauncher({ binDir: directory, nodePath: "C:/Voxiva/node.exe", cliPath: "C:/Voxiva/cli/dist/index.js", platform: "win32" });
  assert.equal(path.basename(result), "voxiva.cmd");
  assert.equal(fs.readFileSync(result, "utf8"), '@echo off\r\n"C:/Voxiva/node.exe" "C:/Voxiva/cli/dist/index.js" %*\r\n');
});

test("POSIX terminal exposes the bundled CLI through an executable voxiva launcher", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "voxiva-shell-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const result = writeCliLauncher({ binDir: directory, nodePath: "/opt/Voxiva/node", cliPath: "/opt/Voxiva/cli/dist/index.js", platform: "linux" });
  assert.equal(path.basename(result), "voxiva");
  assert.equal(fs.readFileSync(result, "utf8"), "#!/bin/sh\nexec '/opt/Voxiva/node' '/opt/Voxiva/cli/dist/index.js' \"$@\"\n");
  if (process.platform !== "win32") assert.ok(fs.statSync(result).mode & 0o111);
});

test("terminal starts a command shell with the Voxiva launcher on PATH", () => {
  assert.deepEqual(createShellConfig({ platform: "win32", env: { ComSpec: "C:/Windows/cmd.exe", Path: "C:/Windows" }, binDir: "C:/Voxiva/bin" }), {
    command: "C:/Windows/cmd.exe",
    args: ["/Q"],
    env: { ComSpec: "C:/Windows/cmd.exe", Path: "C:/Voxiva/bin;C:/Windows" },
  });
  assert.deepEqual(createShellConfig({ platform: "linux", env: { SHELL: "/bin/zsh", PATH: "/usr/bin" }, binDir: "/opt/Voxiva/bin" }), {
    command: "/bin/zsh",
    args: ["-i"],
    env: { SHELL: "/bin/zsh", PATH: "/opt/Voxiva/bin:/usr/bin" },
  });
});

test("desktop terminal starts the CLI shell and shows how to access all CLI commands", () => {
  const start = main.indexOf('ipcMain.handle("terminal:start"');
  const end = main.indexOf('ipcMain.on("terminal:write"');
  const handler = main.slice(start, end);
  assert.match(handler, /writeCliLauncher\(/);
  assert.match(handler, /createShellConfig\(/);
  assert.match(handler, /pty\.spawn\(command, args/);
  assert.doesNotMatch(handler, /pty\.spawn\(nodeRuntime\(\), \[cliEntry\(\), "chat"\]/);
  assert.match(renderer, /voxiva --help.*voxiva.*chat/i);
});
