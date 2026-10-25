const path = require("node:path");

function cliPaths({ isPackaged, appPath, resourcesPath }) {
  const root = isPackaged
    ? path.join(resourcesPath, "app.asar.unpacked", "node_modules", "@voxiva", "cli")
    : path.resolve(appPath, "..", "..");
  return { root, entry: path.join(root, "dist", "index.js") };
}

module.exports = { cliPaths };
