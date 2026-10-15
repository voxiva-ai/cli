# Voxiva CLI

**A coding assistant for your terminal.** Ask questions about a project, work through changes, and review proposed edits before they are applied.

[Русский](README.ru.md) · [简体中文](README.zh-CN.md) · [MIT License](LICENSE) · [Report an issue](https://github.com/voxiva-ai/cli/issues)

## Install

Voxiva supports Windows, macOS, and Linux. The installer sets up Node.js 20 or newer when needed and installs the `voxiva` command for your user.

**Windows PowerShell**

```powershell
irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex
```

**macOS or Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash
```

Open a new terminal and check the installation:

```bash
voxiva doctor
```

## Get started

Open a project directory and start Voxiva:

```bash
cd path/to/your-project
voxiva
```

Connect a model provider with `/connect`, choose a model with `/models`, then describe the task. Voxiva reads project guidance from `AGENTS.md` and can inspect files you mention with `@path/to/file`.

For a single request, use:

```bash
voxiva run "Explain how authentication works in this project"
```

## Models

Voxiva works with OpenAI, Anthropic, Google AI, DeepSeek, Groq, OpenRouter, and OpenCode Zen. Some providers offer free models; access, limits, and pricing depend on the provider and model. A limited anonymous fallback may be available without a key.

To use a DeepSeek V4 model through OpenCode Zen, connect OpenCode Zen with `/connect` and select the model in `/models`. OpenCode Zen usage may be billed by the provider.

## Working in chat

| Action | Command or key |
| --- | --- |
| Connect a provider | `/connect` |
| Choose a model | `/models` |
| Change the working plan | `/plans` or `Tab` |
| Inspect project files | `/files` or `@path/to/file` |
| Apply or skip proposed edits | `y` or `n` |
| Stop a response | `Esc` |
| Continue the latest session | `/continue` |
| Open the command list | `/` |
| Change the terminal theme | `/themes` |
| Check for an update | `/update` |

Use `!command` to run a shell command yourself, for example `!git status`. Voxiva does not automatically execute shell commands suggested by a model. Proposed file edits require your approval before they are written.

## CLI commands

| Command | Purpose |
| --- | --- |
| `voxiva` or `voxiva chat` | Start an interactive session |
| `voxiva run "<prompt>"` | Send one prompt |
| `voxiva ship "<task>"` | Work through a task with the ship plan |
| `voxiva models list` | List available models |
| `voxiva models use <provider/model>` | Set the default model |
| `voxiva models current` | Show the default model |
| `voxiva plan [build, ship, check, explore]` | Show or change the plan |
| `voxiva auth login` | Connect a provider key |
| `voxiva auth list` | Show connected providers |
| `voxiva auth logout [provider]` | Remove a provider key |
| `voxiva doctor` | Check the installation and configuration |
| `voxiva update` | Install the latest version |
| `voxiva config` | Show the configuration directory |

## Privacy and local data

Voxiva stores settings, sessions, and provider keys in `~/.voxiva/`. Keys are kept locally in `auth.json`. Prompts and any project context you provide are sent to the provider serving the selected model; check that provider's privacy and data policies before sharing sensitive information.

## Contributing

Bug fixes, documentation improvements, and focused feature proposals are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and pull request guidance. Report problems or suggest improvements in [GitHub Issues](https://github.com/voxiva-ai/cli/issues).

## License

Voxiva CLI is distributed under the [MIT License](LICENSE).
