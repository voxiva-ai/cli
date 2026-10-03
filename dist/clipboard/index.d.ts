/** Short text stays in the input; longer pastes become a card. */
export declare const LONG_PASTE_CHARS = 160;
export declare const LONG_PASTE_LINES = 4;
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
export declare function isImagePath(path: string): boolean;
/** If path is a ScreenClip folder/guid, find an image file inside. */
export declare function resolveImageAsset(path: string): string | null;
/** Save Windows clipboard bitmap to ~/.voxiva/clips/…png */
export declare function saveClipboardBitmap(): string | null;
/** Copy plain text to the system clipboard (+ OSC 52). */
export declare function writeClipboard(text: string): boolean;
/** Read clipboard: text, dropped files, and bitmap screenshots. */
export declare function readClipboard(): ClipboardRead;
/**
 * Turn clipboard into draft attachments + optional short inline text.
 * Long text / images never dump into the input line.
 */
export declare function clipboardToDraft(clip: ClipboardRead): {
    attachments: DraftAttachment[];
    inlineText: string;
};
/** Bracketed terminal paste → draft (long = card). */
export declare function textToDraft(raw: string): {
    attachments: DraftAttachment[];
    inlineText: string;
};
export declare function normalizeBracketedPaste(raw: string): string;
/** @deprecated kept for tests */
export declare function clipboardToInsert(clip: ClipboardRead, maxChars?: number): {
    text: string;
    images: number;
    truncated: boolean;
};
export declare function clipsHome(): string;
