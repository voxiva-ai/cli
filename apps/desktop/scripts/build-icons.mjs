import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import png2icons from "png2icons";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const outputDir = resolve(here, "../build");
const logoPath = resolve(root, "brand/voxiva-cli-mark.png");
const logo = await readFile(logoPath);
const { data, info } = await sharp(logo).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width, top = info.height, right = -1, bottom = -1;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  if (data[(y * info.width + x) * 4 + 3] > 12) {
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
}
if (right < left || bottom < top) throw new Error(`No visible mark found in ${logoPath}`);
const mark = sharp(logo).extract({ left, top, width: right - left + 1, height: bottom - top + 1 });
const png = await mark.clone().resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const ico = png2icons.createICO(png, png2icons.BICUBIC2, 0, false, true);
const icns = png2icons.createICNS(png, png2icons.BICUBIC2, 0);

if (!ico || !icns) throw new Error("Could not generate desktop icons from brand/voxiva-cli-mark.png");
await mkdir(outputDir, { recursive: true });
await mkdir(resolve(here, "../assets"), { recursive: true });
await Promise.all([
  writeFile(resolve(outputDir, "icon.png"), png),
  writeFile(resolve(outputDir, "icon.ico"), ico),
  writeFile(resolve(outputDir, "icon.icns"), icns),
  writeFile(resolve(here, "../assets/voxiva-cli-mark.png"), png),
]);
