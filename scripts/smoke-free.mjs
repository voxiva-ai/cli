/**
 * Live smoke: built-in free model must answer without any API key.
 * Run: node --import tsx  ... or after build: node scripts/smoke-free.mjs
 */
import { streamChat, DEFAULT_FREE_MODEL, listFreeCatalog } from "../dist/providers/chat.js";

const free = listFreeCatalog();
if (!free.length || !free.every((m) => m.builtin)) {
  console.error("FAIL: free catalog without key must be built-in only");
  process.exit(1);
}

let out = "";
const reply = await streamChat(
  {},
  DEFAULT_FREE_MODEL,
  [
    {
      role: "system",
      content: "You are a coding agent. Reply with working code only when asked.",
    },
    {
      role: "user",
      content: "Write a JS function add(a,b) that returns a+b. Only the function.",
    },
  ],
  {
    onToken: (chunk) => {
      out += chunk;
      process.stdout.write(chunk);
    },
  },
);

process.stdout.write("\n");
if (!reply.trim() || !out.includes("function") && !out.includes("=>") && !out.includes("add")) {
  console.error("FAIL: free model did not return usable code");
  console.error(reply);
  process.exit(1);
}
console.log("OK · free model works ·", DEFAULT_FREE_MODEL);
