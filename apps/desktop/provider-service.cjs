const PROVIDERS = [
  { id: "opencode", label: "OpenCode Zen", url: "https://opencode.ai/auth" },
  { id: "openrouter", label: "OpenRouter", url: "https://openrouter.ai/keys" },
  { id: "openai", label: "OpenAI", url: "https://platform.openai.com/api-keys" },
  { id: "anthropic", label: "Anthropic", url: "https://console.anthropic.com" },
  { id: "google", label: "Google AI", url: "https://aistudio.google.com/apikey" },
  { id: "deepseek", label: "DeepSeek", url: "https://platform.deepseek.com/api_keys" },
  { id: "groq", label: "Groq", url: "https://console.groq.com" },
];

function maskedKey(apiKey) {
  return apiKey.length > 8 ? `${apiKey.slice(0, 4)}…${apiKey.slice(-4)}` : "••••••••";
}

function createProviderHandlers({ loadAuth, saveAuth, providerIds }) {
  const allowed = new Set(PROVIDERS.filter(({ id }) => providerIds.includes(id)).map(({ id }) => id));
  const provider = (id) => {
    if (!allowed.has(id)) throw new Error("Unknown provider.");
  };

  return {
    async state(loadedAuth) {
      const auth = loadedAuth ?? await loadAuth();
      return PROVIDERS.filter(({ id }) => allowed.has(id)).map(({ id, label, url }) => {
        const apiKey = auth[id]?.apiKey;
        return { id, label, url, connected: Boolean(apiKey), maskedKey: apiKey ? maskedKey(apiKey) : "" };
      });
    },
    async save(input) {
      if (!input || typeof input !== "object") throw new Error("Provider details are required.");
      provider(input.id);
      if (typeof input.apiKey !== "string" || !input.apiKey.trim()) throw new Error("API key is required.");
      if (input.apiKey.length > 4096) throw new Error("API key must be 4096 characters or fewer.");
      const auth = await loadAuth();
      auth[input.id] = { apiKey: input.apiKey.trim() };
      await saveAuth(auth);
      return this.state();
    },
    async remove(id) {
      provider(id);
      const auth = await loadAuth();
      delete auth[id];
      await saveAuth(auth);
      return this.state();
    },
  };
}

module.exports = { createProviderHandlers };
