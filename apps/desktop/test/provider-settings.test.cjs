const assert = require("node:assert/strict");
const test = require("node:test");
const { createProviderHandlers } = require("../provider-service.cjs");

function setup() {
  let auth = {};
  const providerIds = ["voxiva", "openai", "anthropic", "opencode", "openrouter", "groq", "google", "deepseek"];
  const handlers = createProviderHandlers({
    providerIds,
    loadAuth: async () => structuredClone(auth),
    saveAuth: async (next) => { auth = structuredClone(next); },
  });
  return { handlers, getAuth: () => auth };
}

test("provider settings return masked status and never expose the key", async () => {
  const { handlers } = setup();
  await handlers.save({ id: "openai", apiKey: "  sk-test-1234567890  " });

  const providers = await handlers.state();
  const openai = providers.find((provider) => provider.id === "openai");

  assert.equal(openai.connected, true);
  assert.equal(openai.maskedKey, "sk-t…7890");
  assert.equal(Object.hasOwn(openai, "apiKey"), false);
});

test("provider settings reject unknown, empty, and oversized keys without saving", async () => {
  const { handlers, getAuth } = setup();

  await assert.rejects(handlers.save({ id: "unknown", apiKey: "secret" }), /Unknown provider/);
  await assert.rejects(handlers.save({ id: "openai", apiKey: "  " }), /API key is required/);
  await assert.rejects(handlers.save({ id: "openai", apiKey: "x".repeat(4097) }), /4096/);
  assert.deepEqual(getAuth(), {});
});

test("removing a provider deletes its key and rejects unknown IDs", async () => {
  const { handlers, getAuth } = setup();
  await handlers.save({ id: "deepseek", apiKey: "ds-test-key" });

  await assert.rejects(handlers.remove("unknown"), /Unknown provider/);
  await handlers.remove("deepseek");

  assert.deepEqual(getAuth(), {});
  assert.equal((await handlers.state()).find((provider) => provider.id === "deepseek").connected, false);
});
