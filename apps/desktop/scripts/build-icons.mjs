import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import png2icons from "png2icons";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const outputDir = resolve(here, "../build");
const svg = await readFile(resolve(root, "brand/voxiva-mark.svg"));
const png = await sharp(svg, { density: 96 }).resize(1024, 1024, { fit: "contain" }).png().toBuffer();
const ico = png2icons.createICO(png, png2icons.BICUBIC2, 0, false, true);
const icns = png2icons.createICNS(png, png2icons.BICUBIC2, 0);

if (!ico || !icns) throw new Error("Could not generate desktop icons from brand/voxiva-mark.svg");
await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDir, "icon.png"), png),
  writeFile(resolve(outputDir, "icon.ico"), ico),
  writeFile(resolve(outputDir, "icon.icns"), icns),
]);
