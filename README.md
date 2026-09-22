# Voxiva CLI

Terminal coding agent from [Voxiva](https://github.com/voxiva-ai).

Connect OpenAI, Anthropic, OpenRouter, Groq, or Google. Switch plans, themes, and languages. Chat in the terminal.

**Beta `v0.1.0`**

## Install

Needs **Node.js 20+** ([nodejs.org](https://nodejs.org/)).

### Quick install (recommended)

No clone. Same idea as OpenCode — one line.

**macOS / Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash
```

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex
```

This installs the global `voxiva` command via npm (registry first, GitHub fallback).

### npm

```bash
npm install -g @voxiva/cli
# or before publish:
npm install -g github:voxiva-ai/cli
```

### From source (contributors)

**macOS / Linux**

```bash
git clone https://github.com/voxiva-ai/cli.git
cd cli
chmod +x scripts/install.sh
./scripts/install.sh
```

**Windows**

```powershell
git clone https://github.com/voxiva-ai/cli.git
cd cli
.\scripts\install.ps1
```

**Manual**

```bash
npm install
npm run build
npm link
```

### Verify

```bash
voxiva --version
voxiva doctor
```

### Uninstall

```bash
npm uninstall -g @voxiva/cli
# or if linked from source:
npm unlink -g @voxiva/cli
```

## Use

```bash
voxiva
```

| | |
|--|--|
| Commands | `/` then ↑↓ · Tab · Enter |
| Palette | `Ctrl+P` |
| Voice | `Ctrl+R` |
| Language | `/lang` |
| Theme | `/themes` |
| Provider | `/connect` |
| Model | `/models` or `/model openai/gpt-4.1-mini` |
| Plans | `/plans` |
| Details | `/details` — full model, theme, usage |
| Cost | `/cost` — session token estimate |
| Diff | `/diff` — git status summary |
| Init | `/init` — create `AGENTS.md` (loaded into prompts) |

Keys: `~/.voxiva/auth.json` or env `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`.

## Plans

`build` · `ship` · `check` · `explore`

Plans adapt to the project stack (TypeScript, Go, Python, Rust, …). Put project rules in `AGENTS.md`.

## Themes

`voxiva` · `slate` · `midnight` · `arctic` · `ember` · `forest` · `mono`

## Languages

`/lang` — en, ru, zh, es, de, fr, ja, pt, ko, hi

## Security

See [SECURITY.md](SECURITY.md). Don’t commit API keys.

## License

MIT — [LICENSE](LICENSE)
