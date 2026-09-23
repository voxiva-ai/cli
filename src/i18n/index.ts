/** UI + reply language for Voxiva CLI. */

export type LocaleId =
  | "en"
  | "ru"
  | "zh"
  | "es"
  | "de"
  | "fr"
  | "ja"
  | "pt"
  | "ko"
  | "hi";

export type LocaleInfo = {
  id: LocaleId;
  label: string;
  native: string;
};

export const LOCALES: readonly LocaleInfo[] = [
  { id: "en", label: "English", native: "English" },
  { id: "ru", label: "Russian", native: "Русский" },
  { id: "zh", label: "Chinese", native: "中文" },
  { id: "es", label: "Spanish", native: "Español" },
  { id: "de", label: "German", native: "Deutsch" },
  { id: "fr", label: "French", native: "Français" },
  { id: "ja", label: "Japanese", native: "日本語" },
  { id: "pt", label: "Portuguese", native: "Português" },
  { id: "ko", label: "Korean", native: "한국어" },
  { id: "hi", label: "Hindi", native: "हिन्दी" },
] as const;

export function getLocale(id: string | undefined): LocaleInfo {
  return LOCALES.find((locale) => locale.id === id) ?? LOCALES[0];
}

export function localeIds(): LocaleId[] {
  return LOCALES.map((locale) => locale.id);
}

/** Appended to the plan system prompt so the model answers in the chosen language. */
export function languageDirective(localeId: LocaleId): string {
  const locale = getLocale(localeId);
  if (locale.id === "en") {
    return "Respond in English unless the user writes in another language or asks otherwise. Keep code identifiers and file paths unchanged.";
  }
  return `Respond in ${locale.label} (${locale.native}) unless the user writes in another language or asks otherwise. Keep code identifiers, APIs, and file paths unchanged.`;
}

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

const DICTS: Record<LocaleId, Dict> = {
  en: {
    placeholder: "Ask anything, or / for commands",
    needConnect: "Connect a provider with /connect — or pick Voxiva Flash Free (no key).",
    needModel: "Pick a model with /models — free ones are at the top.",
    queueBusy: "Queued — runs after this reply.",
    voiceListen: "Listening… Ctrl+R again to stop",
    voiceReady: "Ctrl+R for voice",
    notConnected: "not connected",
    noModel: "no model",
    working: "working…",
    queued: (n) => `queued ${n}`,
    langSet: (name) => `Language → ${name}`,
    unknownLang: "Unknown language. Try /lang en",
  },
  ru: {
    placeholder: "Спроси что угодно или / для команд",
    needConnect: "Подключи провайдера: /connect — или выбери Voxiva Flash Free (без ключа).",
    needModel: "Выбери модель: /models — бесплатные сверху.",
    queueBusy: "В очереди — отправится после ответа.",
    voiceListen: "Слушаю… Ctrl+R ещё раз — стоп",
    voiceReady: "Ctrl+R — голос",
    notConnected: "не подключено",
    noModel: "нет модели",
    working: "думаю…",
    queued: (n) => `очередь ${n}`,
    langSet: (name) => `Язык → ${name}`,
    unknownLang: "Неизвестный язык. Попробуй /lang ru",
  },
  zh: {
    placeholder: "输入问题，或 / 查看命令",
    needConnect: "用 /connect 连接服务商",
    needModel: "用 /models 选择模型",
    queueBusy: "已排队 — 当前回复结束后发送",
    voiceListen: "正在听… 再按 Ctrl+R 结束",
    voiceReady: "Ctrl+R 语音",
    notConnected: "未连接",
    noModel: "无模型",
    working: "工作中…",
    queued: (n) => `排队 ${n}`,
    langSet: (name) => `语言 → ${name}`,
    unknownLang: "未知语言。试试 /lang zh",
  },
  es: {
    placeholder: "Pregunta algo, o / para comandos",
    needConnect: "Conecta un proveedor con /connect.",
    needModel: "Elige un modelo con /models.",
    queueBusy: "En cola — se envía después de esta respuesta.",
    voiceListen: "Escuchando… Ctrl+R otra vez para parar",
    voiceReady: "Ctrl+R para voz",
    notConnected: "sin conexión",
    noModel: "sin modelo",
    working: "trabajando…",
    queued: (n) => `cola ${n}`,
    langSet: (name) => `Idioma → ${name}`,
    unknownLang: "Idioma desconocido. Prueba /lang es",
  },
  de: {
    placeholder: "Frag etwas, oder / für Befehle",
    needConnect: "Provider mit /connect verbinden.",
    needModel: "Modell mit /models wählen.",
    queueBusy: "Warteschlange — nach dieser Antwort.",
    voiceListen: "Höre zu… Ctrl+R erneut zum Stoppen",
    voiceReady: "Ctrl+R für Sprache",
    notConnected: "nicht verbunden",
    noModel: "kein Modell",
    working: "arbeite…",
    queued: (n) => `wartet ${n}`,
    langSet: (name) => `Sprache → ${name}`,
    unknownLang: "Unbekannte Sprache. Versuch /lang de",
  },
  fr: {
    placeholder: "Demande quelque chose, ou / pour les commandes",
    needConnect: "Connecte un fournisseur avec /connect.",
    needModel: "Choisis un modèle avec /models.",
    queueBusy: "En file — après cette réponse.",
    voiceListen: "Écoute… Ctrl+R encore pour arrêter",
    voiceReady: "Ctrl+R pour la voix",
    notConnected: "non connecté",
    noModel: "pas de modèle",
    working: "en cours…",
    queued: (n) => `file ${n}`,
    langSet: (name) => `Langue → ${name}`,
    unknownLang: "Langue inconnue. Essaie /lang fr",
  },
  ja: {
    placeholder: "質問するか / でコマンド",
    needConnect: "/connect でプロバイダを接続",
    needModel: "/models でモデルを選択",
    queueBusy: "キュー待ち — この返信の後に送信",
    voiceListen: "聴取中… 停止はもう一度 Ctrl+R",
    voiceReady: "Ctrl+R で音声",
    notConnected: "未接続",
    noModel: "モデルなし",
    working: "作業中…",
    queued: (n) => `待機 ${n}`,
    langSet: (name) => `言語 → ${name}`,
    unknownLang: "不明な言語です。/lang ja を試して",
  },
  pt: {
    placeholder: "Pergunte algo, ou / para comandos",
    needConnect: "Conecte um provedor com /connect.",
    needModel: "Escolha um modelo com /models.",
    queueBusy: "Na fila — após esta resposta.",
    voiceListen: "Ouvindo… Ctrl+R de novo para parar",
    voiceReady: "Ctrl+R para voz",
    notConnected: "sem conexão",
    noModel: "sem modelo",
    working: "trabalhando…",
    queued: (n) => `fila ${n}`,
    langSet: (name) => `Idioma → ${name}`,
    unknownLang: "Idioma desconhecido. Tente /lang pt",
  },
  ko: {
    placeholder: "무엇이든 물어보거나 / 로 명령",
    needConnect: "/connect 로 프로바이더 연결",
    needModel: "/models 로 모델 선택",
    queueBusy: "대기열 — 이 응답 후 전송",
    voiceListen: "듣는 중… 중지하려면 Ctrl+R 다시",
    voiceReady: "Ctrl+R 음성",
    notConnected: "연결 안 됨",
    noModel: "모델 없음",
    working: "작업 중…",
    queued: (n) => `대기 ${n}`,
    langSet: (name) => `언어 → ${name}`,
    unknownLang: "알 수 없는 언어. /lang ko 시도",
  },
  hi: {
    placeholder: "कुछ भी पूछें, या / कमांड के लिए",
    needConnect: "/connect से प्रोवाइडर जोड़ें",
    needModel: "/models से मॉडल चुनें",
    queueBusy: "कतार में — इस जवाब के बाद",
    voiceListen: "सुन रहा हूँ… रोकने के लिए Ctrl+R",
    voiceReady: "Ctrl+R आवाज़",
    notConnected: "कनेक्ट नहीं",
    noModel: "कोई मॉडल नहीं",
    working: "काम कर रहा…",
    queued: (n) => `कतार ${n}`,
    langSet: (name) => `भाषा → ${name}`,
    unknownLang: "अज्ञात भाषा। /lang hi आज़माएँ",
  },
};

export function t(localeId: LocaleId): Dict {
  return DICTS[localeId] ?? DICTS.en;
}
