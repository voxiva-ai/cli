const fs = require("node:fs");
const path = require("node:path");

function writeCliLauncher({ binDir, nodePath, cliPath, platform = process.platform }) {
  fs.mkdirSync(binDir, { recursive: true });
  const windows = platform === "win32";
  const launcher = path.join(binDir, windows ? "voxiva.cmd" : "voxiva");
  const content = windows
    ? `@echo off\r\n"${nodePath}" "${cliPath}" %*\r\n`
    : `#!/bin/sh\nexec '${nodePath.replace(/'/g, "'\\''")}' '${cliPath.replace(/'/g, "'\\''")}' "$@"\n`;
  fs.writeFileSync(launcher, content);
  if (!windows) fs.chmodSync(launcher, 0o755);
  return launcher;
}

function createShellConfig({ platform = process.platform, env = process.env, binDir }) {
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const nextEnv = { ...env };
  const existing = nextEnv[pathKey];
  nextEnv[pathKey] = [binDir, existing].filter(Boolean).join(platform === "win32" ? ";" : ":");
  return {
    command: platform === "win32" ? env.ComSpec ?? env.COMSPEC ?? "cmd.exe" : env.SHELL || "/bin/sh",
    args: platform === "win32" ? ["/Q"] : ["-i"],
    env: nextEnv,
  };
}

module.exports = { createShellConfig, writeCliLauncher };
