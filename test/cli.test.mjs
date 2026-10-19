import test from "node:test";
import assert from "node:assert/strict";
import { buildProgram } from "../dist/cli.js";

test("registers the documented top-level CLI commands", () => {
  const program = buildProgram();
  assert.deepEqual(
    program.commands.map((command) => command.name()),
    ["auth", "models", "plan", "run", "ship", "chat", "doctor", "install", "update", "config"],
  );
});

test("registers every auth and model subcommand", () => {
  const program = buildProgram();
  const auth = program.commands.find((command) => command.name() === "auth");
  const models = program.commands.find((command) => command.name() === "models");
  assert.deepEqual(auth.commands.map((command) => command.name()), ["login", "list", "logout"]);
  assert.deepEqual(models.commands.map((command) => command.name()), ["list", "use", "current"]);
});
