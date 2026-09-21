import { Command } from "commander";
import chalk from "chalk";
import { authList, authLogin, authLogout } from "./commands/auth.js";
import { chatInteractive } from "./commands/chat.js";
import { modelsCurrent, modelsList, modelsUse } from "./commands/models.js";
import { planShow, planUse } from "./commands/plan.js";
import { runPrompt } from "./commands/run.js";
import { shipTask } from "./commands/ship.js";
import { doctorCheck } from "./commands/doctor.js";
import { installLocal } from "./commands/install.js";
import { configDir } from "./config/store.js";

import { VERSION } from "./tui/copy.js";

const pkg = { version: VERSION };

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("voxiva")
    .description("Voxiva terminal agent — models, plans, and command flows")
    .version(pkg.version, "-v, --version", "Show version")
    .option("--no-color", "Disable colors");

  program.hook("preAction", (command) => {
    if (command.optsWithGlobals().color === false) chalk.level = 0;
  });

  program
    .command("auth")
    .description("Manage provider credentials")
    .addCommand(
      new Command("login")
        .description("Connect an API provider")
        .action(() => authLogin()),
    )
    .addCommand(
      new Command("list")
        .description("List connected providers")
        .action(() => authList()),
    )
    .addCommand(
      new Command("logout")
        .description("Remove a provider")
        .argument("[provider]", "Provider id")
        .action((provider?: string) => authLogout(provider)),
    );

  const models = program.command("models").description("List and switch models");

  models
    .command("list")
    .alias("ls")
    .description("Show available models")
    .action(() => modelsList());

  models
    .command("use")
    .description("Set default model (provider/model)")
    .argument("<ref>", "e.g. openai/gpt-4.1-mini")
    .action((ref: string) => modelsUse(ref));

  models
    .command("current")
    .description("Print default model")
    .action(() => modelsCurrent());

  program
    .command("plan")
    .description("Show or switch agent plan")
    .argument("[id]", "build | ship | check | explore")
    .action((id?: string) => (id ? planUse(id) : planShow()));

  program
    .command("run")
    .description("Run a one-shot prompt")
    .argument("<prompt...>", "Prompt text")
    .option("-m, --model <ref>", "Model override")
    .option("-p, --plan <id>", "Plan override")
    .action(async (promptParts: string[], opts: { model?: string; plan?: string }) => {
      await runPrompt(promptParts.join(" "), opts);
    });

  program
    .command("ship")
    .description("Ship a task end-to-end (uses ship plan)")
    .argument("<task...>", "What to ship")
    .option("-m, --model <ref>", "Model override")
    .action(async (taskParts: string[], opts: { model?: string }) => {
      await shipTask(taskParts.join(" "), opts);
    });

  program
    .command("chat")
    .description("Interactive chat session")
    .action(() => chatInteractive());

  program
    .command("doctor")
    .description("Check install, PATH, model, and auth")
    .action(async () => {
      process.exitCode = await doctorCheck();
    });

  program
    .command("install")
    .description("Install or repair the global voxiva command")
    .action(() => {
      process.exitCode = installLocal();
    });

  program
    .command("config")
    .description("Show config directory")
    .action(() => {
      console.log(configDir());
    });

  program.action(async () => {
    await chatInteractive();
  });

  return program;
}
