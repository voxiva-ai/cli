<p align="center">
  <img src="brand/voxiva-mark.svg" alt="Voxiva" width="112" />
</p>

<h1 align="center">Voxiva CLI</h1>

<p align="center">A coding agent for your terminal. Bring your own model key, inspect your project, and review every file change before it is applied.</p>

<p align="center">
  <a href="README.ru.md">Русский</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://nodejs.org/">Node.js 20+</a> · <a href="LICENSE">MIT License</a> · <a href="https://github.com/voxiva-ai/cli/issues">Issues and ideas</a>
</p>

## Install

**macOS / Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash
```

**Windows PowerShell**

```powershell
irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex
```

Open a new terminal and run:

```bash
voxiva doctor
```

The installer sets up Node.js when needed and installs Voxiva for your user account. If GitHub is slow or unavailable, use the [jsDelivr installer](https://cdn.jsdelivr.net/gh/voxiva-ai/cli@main/install) or download the [latest source archive](https://github.com/voxiva-ai/cli/archive/refs/heads/main.zip).

## Quick start

```bash
cd path/to/your-project
voxiva
```

Voxiva opens an interactive terminal chat. Connect a provider key with `/connect`, choose a model with `/models`, then describe what you want to do. You can also run a one-shot request:

```bash
voxiva run "Explain how authentication works in this project"
```

## What it can do

- Work with OpenAI, Anthropic, Google Gemini, DeepSeek, Groq, OpenRouter, and OpenCode Zen models.
- Read project guidance from `AGENTS.md` and inspect files on request.
- Propose complete file changes for review; apply them only after you approve.
- Keep sessions, workspaces, model choices, and preferences between runs.
- Use plans for building, end-to-end delivery, review, and read-only exploration.
- Work in English, Russian, and Chinese, with themes and keyboard shortcuts.

Model access and pricing come from the provider you choose. A limited anonymous fallback may be available without a key; for reliable use, connect your own provider credentials.

## In chat

| Action | How |
| --- | --- |
| Connect a provider | `/connect` |
| Choose a model or plan | `/models` · `/plans` · `Tab` |
| Inspect project files | `/files` · `@path/to/file` |
| Stop a response | `Esc` |
| Approve or skip proposed edits | `y` · `n` |
| Resume a session | `/continue` |
| Open commands | `/` |

Use `!command` to run a shell command from chat, for example `!git status`. Voxiva does not run model-proposed shell commands automatically.

## Configuration and privacy

Configuration and sessions are stored in `~/.voxiva/`. Provider keys are stored locally in `auth.json`; prompts are sent to the provider serving the selected model. Review that provider's data policy before sending sensitive project content.

Run `voxiva doctor` to check your installation. Run `voxiva update` to install the latest version.

## Contributing

Bug reports, documentation fixes, and focused feature ideas are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, checks, and pull request guidance. Use [GitHub Issues](https://github.com/voxiva-ai/cli/issues) to report a problem or suggest an improvement.

## License

[MIT](LICENSE)
