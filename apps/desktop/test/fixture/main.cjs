const { app } = require("electron");
const path = require("node:path");
const pty = require("node-pty");

app.whenReady().then(() => {
  const cli = path.resolve(__dirname, "../../node_modules/@voxiva/cli/dist/index.js");
  const run = (command, args) => new Promise((resolve, reject) => {
    const child = pty.spawn(command, args, {
      cwd: path.resolve(__dirname, "../../../.."),
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      env: process.env,
    });
    let output = "";
    child.onData((data) => { output += data; });
    child.onExit(({ exitCode }) => exitCode === 0 ? resolve(output) : reject(new Error(`exit ${exitCode}: ${output}`)));
  });
  const timeout = setTimeout(() => {
    console.error("PTY smoke test timed out.");
    app.exit(1);
  }, 15000);
  const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
  const shellArgs = process.platform === "win32" ? ["/d", "/c", "echo PTY_CHILD_OK"] : ["-c", "printf PTY_CHILD_OK"];
  run(shell, shellArgs)
    .then((output) => {
      if (!output.includes("PTY_CHILD_OK")) throw new Error(`Shell child produced no output: ${output.trim()}`);
      const node = path.resolve(__dirname, "../../node_modules/node/bin", process.platform === "win32" ? "node.exe" : "node");
      return run(node, [cli, "--version"]);
    })
    .then((output) => {
      if (!output.includes("0.1.4")) throw new Error(`CLI produced no version: ${output.trim()}`);
      console.log(`PTY launched Voxiva CLI ${output.trim()}`);
      clearTimeout(timeout);
      app.exit(0);
    })
    .catch((error) => {
      console.error(`PTY smoke failed: ${error.message}`);
      clearTimeout(timeout);
      app.exit(1);
    });
});
