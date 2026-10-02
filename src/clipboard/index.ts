import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { configDir } from "../config/store.js";

const IMAGE_EXT = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
  ".ico",
  ".tif",
  ".tiff",
  ".heic",
  ".avif",
]);

/** Short text stays in the input; longer pastes become a card. */
export const LONG_PASTE_CHARS = 160;
export const LONG_PASTE_LINES = 4;

export type ClipboardRead = {
  text: string;
  files: string[];
  /** Fresh PNG saved from clipboard bitmap (Win+Shift+S etc.). */
  imagePath?: string;
};

export type DraftAttachment = {
  id: string;
  kind: "image" | "file" | "paste";
  label: string;
  path?: string;
  text?: string;
  detail?: string;
};

function powershell(command: string, input?: string): { ok: boolean; out: string } {
  const result = spawnSync(
    "powershell",
    ["-NoProfile", "-NonInteractive", "-Command", command],
    {
      input,
      encoding: "utf8",
      windowsHide: true,
      timeout: 8000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  return {
    ok: result.status === 0,
    out: (result.stdout ?? "").replace(/^\uFEFF/, ""),
  };
}

function clipsDir(): string {
  const dir = join(configDir(), "clips");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImagePath(path: string): boolean {
  const ext = extname(path).toLowerCase();
  if (IMAGE_EXT.has(ext)) return true;
  // Windows Snipping Tool temp paths often have no extension.
  const lower = path.toLowerCase().replace(/\\/g, "/");
  return lower.includes("/screenclip/") || lower.includes("\\screenclip\\");
}

/** If path is a ScreenClip folder/guid, find an image file inside. */
export function resolveImageAsset(path: string): string | null {
  if (!path || !existsSync(path)) return null;
  try {
    const st = statSync(path);
    if (st.isFile()) return path;
    if (st.isDirectory()) {
      const kids = readdirSync(path);
      const hit = kids.find((name) => IMAGE_EXT.has(extname(name).toLowerCase()));
      if (hit) return join(path, hit);
      // sometimes the GUID itself is the file without extension
      const bare = kids.find((name) => !name.includes("."));
      if (bare) {
        const full = join(path, bare);
        if (statSync(full).isFile()) return full;
      }
    }
  } catch {
    return null;
  }
  return isImagePath(path) ? path : null;
}

/** Save Windows clipboard bitmap to ~/.voxiva/clips/…png */
export function saveClipboardBitmap(): string | null {
  if (process.platform !== "win32") return null;
  const outPath = join(clipsDir(), `paste-${stamp()}.png`).replace(/'/g, "''");
  const { ok, out } = powershell(`
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$img = [System.Windows.Forms.Clipboard]::GetImage()
if ($null -eq $img) { exit 2 }
$path = '${outPath}'
$img.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
$path
`);
  if (!ok) return null;
  const saved = out.trim().split(/\r?\n/).pop()?.trim();
  return saved && existsSync(saved) ? saved : null;
}

/** Copy plain text to the system clipboard (+ OSC 52). */
export function writeClipboard(text: string): boolean {
  if (!text) return false;
  try {
    const b64 = Buffer.from(text, "utf8").toString("base64");
    process.stdout.write(`\x1b]52;c;${b64}\x07`);
  } catch {
    // ignore
  }
  try {
    if (process.platform === "win32") {
      const result = spawnSync(
        "powershell",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          "[Console]::InputEncoding = New-Object System.Text.UTF8Encoding $false; $t = [Console]::In.ReadToEnd(); Set-Clipboard -Value $t",
        ],
        { input: text, encoding: "utf8", windowsHide: true, timeout: 4000 },
      );
      return result.status === 0;
    }
    if (process.platform === "darwin") {
      return spawnSync("pbcopy", [], { input: text, timeout: 4000 }).status === 0;
    }
    if (spawnSync("xclip", ["-selection", "clipboard"], { input: text, timeout: 4000 }).status === 0) {
      return true;
    }
    if (spawnSync("xsel", ["--clipboard", "--input"], { input: text, timeout: 4000 }).status === 0) {
      return true;
    }
    return spawnSync("wl-copy", [], { input: text, timeout: 4000 }).status === 0;
  } catch {
    return false;
  }
}

function readWindowsFiles(): string[] {
  const { ok, out } = powershell(
    "Get-Clipboard -Format FileDropList -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName }",
  );
  if (!ok || !out.trim()) return [];
  return out
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && existsSync(line));
}

function readWindowsText(): string {
  const { ok, out } = powershell(
    "$ErrorActionPreference='SilentlyContinue'; Get-Clipboard -Raw",
  );
  return ok ? out.replace(/\r\n/g, "\n").replace(/\r/g, "\n") : "";
}

function readDarwinText(): string {
  const result = spawnSync("pbpaste", [], { encoding: "utf8", timeout: 4000 });
  return result.status === 0 ? (result.stdout ?? "").replace(/\r\n/g, "\n") : "";
}

function readLinuxText(): string {
  for (const cmd of [
    ["xclip", ["-selection", "clipboard", "-o"]],
    ["xsel", ["--clipboard", "--output"]],
    ["wl-paste", []],
  ] as const) {
    try {
      const result = spawnSync(cmd[0], [...cmd[1]], { encoding: "utf8", timeout: 4000 });
      if (result.status === 0 && result.stdout != null) {
        return String(result.stdout).replace(/\r\n/g, "\n");
      }
    } catch {
      // try next
    }
  }
  return "";
}

function saveLinuxClipboardImage(): string | null {
  if (process.platform === "win32" || process.platform === "darwin") return null;
  const outPath = join(clipsDir(), `paste-${stamp()}.png`);
  for (const args of [
    ["xclip", ["-selection", "clipboard", "-t", "image/png", "-o"]],
    ["wl-paste", ["--type", "image/png"]],
  ] as const) {
    try {
      const result = spawnSync(args[0], [...args[1]], {
        encoding: "buffer",
        timeout: 4000,
        maxBuffer: 12 * 1024 * 1024,
      });
      if (result.status === 0 && result.stdout && (result.stdout as Buffer).length > 32) {
        writeFileSync(outPath, result.stdout as Buffer);
        return outPath;
      }
    } catch {
      // next
    }
  }
  return null;
}

function saveDarwinClipboardImage(): string | null {
  if (process.platform !== "darwin") return null;
  const outPath = join(clipsDir(), `paste-${stamp()}.png`);
  const result = spawnSync("osascript", [
    "-e",
    `try
      set pngData to the clipboard as «class PNGf»
      set outFile to open for access POSIX file "${outPath.replace(/"/g, '\\"')}" with write permission
      write pngData to outFile
      close access outFile
      return "${outPath.replace(/"/g, '\\"')}"
    end try`,
  ], { encoding: "utf8", timeout: 5000 });
  if (result.status === 0 && existsSync(outPath)) return outPath;
  return null;
}

/** Read clipboard: text, dropped files, and bitmap screenshots. */
export function readClipboard(): ClipboardRead {
  if (process.platform === "win32") {
    const imagePath = saveClipboardBitmap() ?? undefined;
    const files = readWindowsFiles();
    const text = readWindowsText();
    return { text, files, imagePath };
  }
  if (process.platform === "darwin") {
    return {
      text: readDarwinText(),
      files: [],
      imagePath: saveDarwinClipboardImage() ?? undefined,
    };
  }
  return {
    text: readLinuxText(),
    files: [],
    imagePath: saveLinuxClipboardImage() ?? undefined,
  };
}

function niceLabel(path: string): string {
  const base = basename(path);
  if (/^paste-\d{8}-\d{6}/.test(base)) return "screenshot";
  // Windows snip GUIDs: {B4E0FAED-78…504ED}.png
  if (/^\{[0-9A-Fa-f-]+\}\.\w+$/i.test(base) || /^\{[0-9A-Fa-f-]+\}$/i.test(base)) {
    return "screenshot";
  }
  if (base.length > 22) return base.slice(0, 8) + "…" + extname(base);
  return base || "screenshot";
}

function fileDetail(path: string): string {
  try {
    return formatBytes(statSync(path).size);
  } catch {
    return "";
  }
}

let attachSeq = 0;
function nextId(): string {
  attachSeq += 1;
  return `a${Date.now().toString(36)}${attachSeq}`;
}

/**
 * Turn clipboard into draft attachments + optional short inline text.
 * Long text / images never dump into the input line.
 */
export function clipboardToDraft(clip: ClipboardRead): {
  attachments: DraftAttachment[];
  inlineText: string;
} {
  const attachments: DraftAttachment[] = [];
  const seen = new Set<string>();

  const addImage = (path: string) => {
    const resolved = resolveImageAsset(path);
    const finalPath = resolved ?? (existsSync(path) ? path : null);
    if (!finalPath) return;
    if (seen.has(finalPath)) return;
    seen.add(finalPath);
    attachments.push({
      id: nextId(),
      kind: "image",
      label: niceLabel(finalPath),
      path: finalPath,
      detail: fileDetail(finalPath),
    });
  };

  if (clip.imagePath) addImage(clip.imagePath);

  for (const file of clip.files) {
    const asImage = resolveImageAsset(file);
    if (asImage || isImagePath(file)) {
      addImage(asImage ?? file);
    } else {
      if (seen.has(file)) continue;
      seen.add(file);
      attachments.push({
        id: nextId(),
        kind: "file",
        label: basename(file),
        path: file,
        detail: fileDetail(file),
      });
    }
  }

  let body = clip.text.trim();
  // Snip tool sometimes puts the temp path as text — treat as image.
  if (body && !attachments.length && (isImagePath(body) || existsSync(body))) {
    const resolved = resolveImageAsset(body);
    if (resolved) {
      addImage(resolved);
      body = "";
    }
  }

  // Path-looking ScreenClip fragments in text
  const pathHit = body.match(
    /[A-Za-z]:\\[^\n]+ScreenClip[^\n]+|\/(?:Users|home)\/[^\n]+ScreenClip[^\n]+/i,
  );
  if (pathHit) {
    const candidate = pathHit[0].trim();
    const resolved = resolveImageAsset(candidate);
    if (resolved) {
      addImage(resolved);
      body = body.replace(pathHit[0], "").trim();
    }
  }

  let inlineText = "";
  if (body) {
    const lines = body.split("\n");
    const isLong =
      body.length >= LONG_PASTE_CHARS || lines.length >= LONG_PASTE_LINES;
    if (isLong) {
      attachments.push({
        id: nextId(),
        kind: "paste",
        label: "paste",
        text: body.slice(0, 100_000),
        detail: `${lines.length} line${lines.length === 1 ? "" : "s"} · ${formatBytes(Buffer.byteLength(body))}`,
      });
    } else {
      inlineText = body.replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
    }
  }

  return { attachments, inlineText };
}

/** Bracketed terminal paste → draft (long = card). */
export function textToDraft(raw: string): {
  attachments: DraftAttachment[];
  inlineText: string;
} {
  return clipboardToDraft({ text: raw, files: [] });
}

export function normalizeBracketedPaste(raw: string): string {
  return raw
    .replace(/\x1b\[200~/g, "")
    .replace(/\x1b\[201~/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}

/** @deprecated kept for tests */
export function clipboardToInsert(clip: ClipboardRead, maxChars = 20_000) {
  const { attachments, inlineText } = clipboardToDraft({
    ...clip,
    text: clip.text.slice(0, maxChars),
  });
  const parts = [
    ...attachments
      .filter((a) => a.path)
      .map((a) => (a.path!.includes(" ") ? `@\"${a.path}\"` : `@${a.path}`)),
    inlineText,
  ];
  return {
    text: parts.filter(Boolean).join(" ").trim(),
    images: attachments.filter((a) => a.kind === "image").length,
    truncated: clip.text.length > maxChars,
  };
}

export function clipsHome(): string {
  return clipsDir();
}
