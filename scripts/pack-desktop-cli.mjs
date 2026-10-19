import { copyFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = process.cwd();
const vendor = resolve(root, "apps/desktop/vendor");
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this script through npm.");
const result = execFileSync(process.execPath, [npmCli, "pack", "--ignore-scripts", "--json", "--pack-destination", vendor], {
  cwd: root,
  encoding: "utf8",
});
const [{ filename }] = JSON.parse(result);
const packed = resolve(vendor, filename);
const stableTarball = resolve(vendor, "voxiva-cli.tgz");

await copyFile(packed, stableTarball);
if (packed !== stableTarball) await rm(packed);
console.log(`Prepared ${stableTarball}`);
