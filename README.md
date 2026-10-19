<p align="center"><img src="brand/voxiva-logo.png" alt="Voxiva" width="96" /></p>

<h1 align="center">Voxiva CLI</h1>

<p align="center">
  A coding assistant for your terminal. Explore a project, work through a task, and review proposed file changes before they are applied.
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.ru.md">Русский</a> ·
  <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://nodejs.org/"><img alt="Node.js 20+" src="https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square" /></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-39d9ff?style=flat-square" /></a>
  <a href="https://github.com/voxiva-ai/cli/issues"><img alt="Issues" src="https://img.shields.io/github/issues/voxiva-ai/cli?style=flat-square&color=2aa8ff" /></a>
</p>

> **Beta v0.1.4.** Voxiva CLI is usable today, and its commands and interface are still evolving.

## A coding assistant in your terminal

Voxiva CLI works from your project directory. Ask about the code, provide project instructions in `AGENTS.md`, and get proposed file edits that you can review before applying.

### Highlights

- **Bring your model provider** — connect OpenAI, Anthropic, Google AI, DeepSeek, Groq, OpenRouter, or OpenCode Zen.
- **Work with project context** — inspect files with `/files` or mention a path with `@path/to/file`.
- **Review before writing** — approve or skip proposed file changes in the chat.
- **Keep work together** — resume sessions and switch between recent project folders.
- **Choose a workflow** — use build, ship, check, and explore plans.
- **Make the terminal yours** — choose a saved theme or use Auto when the terminal exposes its background color.

## Install

Voxiva supports Windows, macOS, and Linux. The installer sets up Node.js 20 or newer when needed and installs the `voxiva` command for your user.

### Windows

Run in PowerShell:

```powershell
irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex
```

### macOS and Linux

```bash
curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash
```

Open a new terminal and verify the installation:

```bash
voxiva doctor
```

## Desktop app

Voxiva CLI also runs in a desktop window on Windows, macOS, and Linux. The desktop app opens with a centered chat, model and plan selectors, and reviewable file changes; the Terminal view keeps the full CLI TUI and its commands available. Both views share Voxiva's provider settings. Download a system installer from [GitHub Actions](https://github.com/voxiva-ai/cli/actions/workflows/desktop.yml) after a successful build. Swift and a separate Node.js installation are not required to run a packaged app.

## Quick start

Move to a project directory and launch the chat:

```bash
cd path/to/your-project
voxiva
```

Connect a provider with `/connect`, choose a model with `/models`, and describe what you want to do. For a one-time prompt, run:

```bash
voxiva run "Explain how authentication works in this project"
```

## Models and providers

Connect a provider key in the chat with `/connect` or from the terminal with `voxiva auth login`. Then select a model with `/models` or `voxiva models use <provider/model>`.

Model availability, limits, and pricing are set by each provider. A limited anonymous fallback may be available without a key, but it is not a DeepSeek model. The DeepSeek API requires a key and bills usage; check [current pricing](https://api-docs.deepseek.com/quick_start/pricing/) before use. Choosing DeepSeek in `/models` selects V4.1 Flash (`deepseek-flash`); V4 Pro is also available. The direct Flash route disables thinking to reduce token use. Voxiva caps DeepSeek replies at 8,192 output tokens, so unusually large file changes may need to be split across requests. DeepSeek models are also available through OpenCode Zen, with separate provider pricing.

## Chat controls

| Action | Command or key |
| --- | --- |
| Connect a provider | `/connect` |
| Choose a model | `/models` |
| Change the plan | `/plans` or `Tab` |
| Inspect files | `/files` or `@path/to/file` |
| Approve or skip proposed edits | `y` or `n` |
| Stop a response | `Esc` |
| Continue the latest session | `/continue` |
| Switch project folder | `/workspaces` |
| Change the theme | `/themes` |
| Check for an update | `/update` |
| Open the command list | `/` |

Type `!command` to run a shell command yourself, for example `!git status`. Voxiva does not run shell commands suggested by the model automatically.

## CLI reference

| Command | Description |
| --- | --- |
| `voxiva` or `voxiva chat` | Start an interactive session |
| `voxiva run "<prompt>"` | Send a one-time prompt |
| `voxiva ship "<task>"` | Work through a task with the ship plan |
| `voxiva models list` | List available models |
| `voxiva models use <provider/model>` | Set the default model |
| `voxiva models current` | Show the default model |
| `voxiva plan [id]` | Show or change the plan: `build`, `ship`, `check`, or `explore` |
| `voxiva auth login` | Connect a provider key |
| `voxiva auth list` | List connected providers |
| `voxiva auth logout [provider]` | Remove a provider key |
| `voxiva doctor` | Check the installation and configuration |
| `voxiva update` | Install the latest version |
| `voxiva config` | Print the configuration directory |

## Updates and themes

Run `/update` in chat to check for a new version and install it from the centered update window. Run `voxiva update` from a terminal to update directly. Restart Voxiva after installation to use the new version.

Run `/themes` to choose and save a theme. **Auto (terminal)** uses `COLORFGBG` when available and falls back to Voxiva Blue.

## Privacy

Voxiva stores settings, sessions, and provider keys in `~/.voxiva/`. Keys are kept locally in `auth.json`. Prompts and project context you provide are sent to the provider serving the selected model. Review that provider's privacy and data policies before sharing sensitive information.

## Build from source

Requirements: Node.js 20 or newer and npm.

```bash
git clone https://github.com/voxiva-ai/cli.git
cd cli
npm ci
npm run build
npm run dev
```

Run the checks with:

```bash
npm test
```

## Contributing

Bug reports, documentation improvements, and focused pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and contribution guidance. Report an issue or suggest an improvement on [GitHub Issues](https://github.com/voxiva-ai/cli/issues).

## License

[MIT](LICENSE)
