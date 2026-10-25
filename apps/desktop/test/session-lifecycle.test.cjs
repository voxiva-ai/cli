const assert = require("node:assert/strict");
const test = require("node:test");
const { createSessionHandlers, getLastSessionId } = require("../session-service.cjs");

function setup(records = []) {
  let currentProject = "C:/work/alpha";
  const stored = structuredClone(records);
  const handlers = createSessionHandlers({
    getCurrentProject: () => currentProject,
    sessions: {
      listSessionsForCwd: async (cwd) => stored.filter((item) => item.cwd === cwd),
      getSession: async (id) => stored.find((item) => item.id === id),
      saveSession: async (item) => {
        const index = stored.findIndex((row) => row.id === item.id);
        if (index < 0) stored.push(item);
        else stored[index] = item;
        return item.id;
      },
    },
  });
  return { handlers, stored, setProject: (cwd) => { currentProject = cwd; } };
}

test("session list returns current-project summaries without message bodies", async () => {
  const { handlers } = setup([
    { id: "alpha-1", title: "Alpha", updatedAt: "2026-10-18", plan: "build", cwd: "C:/work/alpha", messages: [{ role: "user", content: "secret prompt" }] },
    { id: "beta-1", title: "Beta", updatedAt: "2026-10-19", plan: "check", cwd: "C:/work/beta", messages: [] },
  ]);

  const sessions = await handlers.list();

  assert.deepEqual(sessions, [{ id: "alpha-1", title: "Alpha", updatedAt: "2026-10-18", plan: "build" }]);
});

test("session open refuses IDs from another project and malformed IDs", async () => {
  const { handlers } = setup([
    { id: "alpha-1", title: "Alpha", updatedAt: "2026-10-18", plan: "build", cwd: "C:/work/alpha", messages: [] },
    { id: "beta-1", title: "Beta", updatedAt: "2026-10-19", plan: "check", cwd: "C:/work/beta", messages: [] },
  ]);

  await assert.rejects(handlers.open("beta-1"), /not found for this project/);
  await assert.rejects(handlers.open({ id: "alpha-1" }), /Invalid session ID/);
  assert.equal((await handlers.open("alpha-1")).title, "Alpha");
});

test("session save stores only bounded user/assistant history with a useful title", async () => {
  const { handlers, stored } = setup();
  const messages = [
    { role: "system", content: "system instructions" },
    { role: "user", content: "  Build   a fast CLI  " },
    { role: "assistant", content: "Done." },
  ];

  await handlers.save({ id: "alpha-new", plan: "build", model: "voxiva/big-pickle", messages });

  assert.equal(stored[0].id, "alpha-new");
  assert.equal(stored[0].title, "Build a fast CLI");
  assert.equal(stored[0].cwd, "C:/work/alpha");
  assert.equal(stored[0].model, "voxiva/big-pickle");
  assert.deepEqual(stored[0].messages, [
    { role: "user", content: "  Build   a fast CLI  " },
    { role: "assistant", content: "Done." },
  ]);
});

test("session save keeps only the latest 40 messages and preserves its original title", async () => {
  const existing = { id: "alpha-new", title: "Original title", cwd: "C:/work/alpha" };
  const { handlers, stored } = setup([existing]);
  const messages = Array.from({ length: 45 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: `message-${index}` }));

  await handlers.save({ id: "alpha-new", plan: "build", messages });

  assert.equal(stored[0].title, "Original title");
  assert.equal(stored[0].messages.length, 40);
  assert.equal(stored[0].messages[0].content, "message-5");
});

test("last session lookup ignores stale IDs from a different project", async () => {
  const workspaces = { getWorkspace: async () => ({ lastSessionId: "old-session" }) };
  const sessions = { getSession: async () => ({ id: "old-session", cwd: "C:/work/other" }) };

  assert.equal(await getLastSessionId({ cwd: "C:/work/alpha", workspaces, sessions }), null);
  sessions.getSession = async () => ({ id: "old-session", cwd: "C:/work/alpha" });
  assert.equal(await getLastSessionId({ cwd: "C:/work/alpha", workspaces, sessions }), "old-session");
});
