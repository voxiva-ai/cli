import * as p from "@clack/prompts";
import { c, vMark } from "../brand/index.js";
import { loadAuth, saveAuth, type ProviderId } from "../config/store.js";

const PROVIDERS: { id: ProviderId; label: string; hint: string }[] = [
  { id: "openai", label: "OpenAI", hint: "platform.openai.com/api-keys" },
  { id: "anthropic", label: "Anthropic", hint: "console.anthropic.com" },
  { id: "openrouter", label: "OpenRouter", hint: "openrouter.ai/keys" },
  { id: "groq", label: "Groq", hint: "console.groq.com" },
  { id: "google", label: "Google AI", hint: "aistudio.google.com/apikey" },
];

export async function authLogin(): Promise<void> {
  console.log(vMark(true));
  console.log("");

  const provider = await p.select({
    message: "Connect a model provider",
    options: PROVIDERS.map((pr) => ({
      value: pr.id,
      label: pr.label,
      hint: pr.hint,
    })),
  });

  if (p.isCancel(provider)) {
    p.cancel("Cancelled.");
    return;
  }

  const apiKey = await p.password({
    message: `API key for ${provider}`,
    validate: (v) => (v?.trim() ? undefined : "Key is required"),
  });

  if (p.isCancel(apiKey)) {
    p.cancel("Cancelled.");
    return;
  }

  const auth = await loadAuth();
  auth[provider as ProviderId] = { apiKey: apiKey.trim() };
  await saveAuth(auth);

  p.outro(c.ok(`✓ ${provider} connected`));
}

export async function authList(): Promise<void> {
  const auth = await loadAuth();
  const connected = PROVIDERS.filter((pr) => auth[pr.id]?.apiKey);

  if (connected.length === 0) {
    console.log(c.muted("No providers connected. Run:"), c.brand("voxiva auth login"));
    return;
  }

  console.log(c.bold("Connected providers:\n"));
  for (const pr of connected) {
    const key = auth[pr.id]!.apiKey;
    const masked = key.length > 8 ? `${key.slice(0, 4)}…${key.slice(-4)}` : "••••";
    console.log(`  ${c.brand("●")} ${pr.label.padEnd(12)} ${c.muted(masked)}`);
  }
}

export async function authLogout(provider?: string): Promise<void> {
  const auth = await loadAuth();

  if (!provider) {
    const pick = await p.select({
      message: "Remove which provider?",
      options: PROVIDERS.filter((pr) => auth[pr.id]?.apiKey).map((pr) => ({
        value: pr.id,
        label: pr.label,
      })),
    });
    if (p.isCancel(pick)) return;
    provider = pick as string;
  }

  delete auth[provider as ProviderId];
  await saveAuth(auth);
  p.outro(c.ok(`Removed ${provider}`));
}
