const path = require("node:path");

function normalizedPath(value) {
  if (typeof value !== "string") return "";
  const normalized = path.resolve(value);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function history(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
    .slice(-40)
    .map(({ role, content }) => ({ role, content }));
}

async function getLastSessionId({ cwd, workspaces, sessions }) {
  const id = (await workspaces.getWorkspace(cwd))?.lastSessionId;
  if (!id) return null;
  const session = await sessions.getSession(id);
  return session?.cwd && normalizedPath(session.cwd) === normalizedPath(cwd) ? id : null;
}

function createSessionHandlers({ sessions, getCurrentProject }) {
  return {
    async list() {
      const cwd = getCurrentProject();
      if (!cwd) return [];
      const rows = await sessions.listSessionsForCwd(cwd);
      return rows.map(({ id, title, updatedAt, plan, model }) => ({
        id, title, updatedAt, plan, ...(model ? { model } : {}),
      }));
    },
    async open(id) {
      if (typeof id !== "string" || !id.trim() || id.length > 128) throw new Error("Invalid session ID.");
      const cwd = getCurrentProject();
      const session = await sessions.getSession(id);
      if (!cwd || !session || normalizedPath(session.cwd) !== normalizedPath(cwd)) {
        throw new Error("Session not found for this project.");
      }
      return { ...session, messages: history(session.messages) };
    },
    async save({ id, plan, model, messages }) {
      const cwd = getCurrentProject();
      if (!cwd) throw new Error("Choose a project folder first.");
      if (typeof id !== "string" || !id.trim() || id.length > 128) throw new Error("Invalid session ID.");
      const safeMessages = history(messages);
      const existing = await sessions.getSession(id);
      const firstPrompt = safeMessages.find((message) => message.role === "user")?.content ?? "New session";
      const title = existing?.title || firstPrompt.replace(/\s+/g, " ").trim().slice(0, 72) || "New session";
      await sessions.saveSession({
        id,
        title,
        cwd,
        plan: typeof plan === "string" ? plan : "build",
        model: typeof model === "string" && model.length <= 256 ? model : undefined,
        messages: safeMessages,
      });
      return { id, title };
    },
  };
}

module.exports = { createSessionHandlers, getLastSessionId };
