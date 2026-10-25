const COMMANDS = [
  ["new", "New session", "⌘/Ctrl+N"], ["models", "Models and providers", ""],
  ["plans", "Agent plan", ""], ["connect", "Connect a provider", ""],
  ["sessions", "Recent sessions", ""], ["workspaces", "Recent projects", ""],
  ["doctor", "Run diagnostics", ""], ["update", "Check for updates", ""],
];

function createAppActions({ config, themes, locales, getStatus }) {
  const themeIds = themes.map((theme) => typeof theme === "string" ? theme : theme.id);
  const localeIds = locales.map((locale) => typeof locale === "string" ? locale : locale.id);
  return {
    async preferences() {
      const saved = await config.loadConfig();
      return { theme: saved.theme ?? "auto", locale: saved.locale ?? "en" };
    },
    async setPreferences(input) {
      if (!input || typeof input !== "object") throw new Error("Preferences are required.");
      const patch = {};
      if (Object.hasOwn(input, "theme")) {
        if (!themeIds.includes(input.theme)) throw new Error("Unsupported theme.");
        patch.theme = input.theme;
      }
      if (Object.hasOwn(input, "locale")) {
        if (!localeIds.includes(input.locale)) throw new Error("Unsupported locale.");
        patch.locale = input.locale;
      }
      return config.patchConfig(patch).then(({ theme, locale }) => ({ theme, locale }));
    },
    async doctor() { return { runtime: process.versions.node, ...await getStatus() }; },
    options: () => ({ themes: themes.map((theme) => typeof theme === "string" ? { id: theme, label: theme } : { id: theme.id, label: theme.label }), locales: locales.map((locale) => typeof locale === "string" ? { id: locale, label: locale } : locale) }),
    commands: () => COMMANDS.map(([id, label, shortcut]) => ({ id, label, shortcut })),
  };
}

module.exports = { createAppActions };
