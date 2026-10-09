/** UI + reply language for Voxiva CLI. */
export type LocaleId = "en" | "ru" | "zh" | "es" | "de" | "fr" | "ja" | "pt" | "ko" | "hi";
export type LocaleInfo = {
    id: LocaleId;
    label: string;
    native: string;
};
export declare const LOCALES: readonly LocaleInfo[];
export declare function getLocale(id: string | undefined): LocaleInfo;
export declare function localeIds(): LocaleId[];
/** Auto-select Russian for a first Cyrillic prompt; explicit locale choices still win. */
export declare function detectPromptLocale(text: string): LocaleId | undefined;
/** Appended to the plan system prompt so the model answers in the chosen language. */
export declare function languageDirective(localeId: LocaleId): string;
type Dict = {
    placeholder: string;
    needConnect: string;
    needModel: string;
    queueBusy: string;
    voiceListen: string;
    voiceReady: string;
    notConnected: string;
    noModel: string;
    working: string;
    queued: (n: number) => string;
    langSet: (name: string) => string;
    unknownLang: string;
};
export declare function t(localeId: LocaleId): Dict;
export {};
