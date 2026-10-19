import { readFile, writeFile } from "node:fs/promises";

const tag = process.env.TAG ?? "";
const version = tag.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Expected a version tag such as v1.2.3.");
const cli = JSON.parse(await readFile("package.json", "utf8"));
if (cli.version !== version) throw new Error(`Tag ${tag} must match the CLI package version ${cli.version}.`);

for (const file of ["apps/desktop/package.json", "apps/desktop/package-lock.json"]) {
  const pkg = JSON.parse(await readFile(file, "utf8"));
  pkg.version = version;
  if (pkg.packages?.[""]) pkg.packages[""].version = version;
  await writeFile(file, JSON.stringify(pkg, null, 2) + "\n");
}
