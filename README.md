# Voxiva CLI

Terminal coding agent from **[Voxi.ly](https://github.com/voxiva-ai)** / Voxiva.

Connect OpenAI, Anthropic, OpenRouter, Groq, or Google. Switch plans. Chat in the terminal.

![Voxi.ly](brand/org-avatar.png)

## Install

Needs **Node.js 20+**.

### From this repo (recommended while in beta)

**Windows (PowerShell)**

```powershell
git clone https://github.com/voxiva-ai/cli.git
cd cli
.\scripts\install.ps1
```

**macOS / Linux**

```bash
git clone https://github.com/voxiva-ai/cli.git
cd cli
chmod +x scripts/install.sh
./scripts/install.sh
```

**npm link (any OS)**

```bash
git clone https://github.com/voxiva-ai/cli.git
cd cli
npm install
npm run build
npm link
```

Check:

```bash
voxiva --version
voxiva doctor
```

### From npm (when published)

```bash
npm install -g @voxiva/cli
```

## Quick start

```bash
voxiva
```

In the TUI:

| Action | How |
|--------|-----|
| Commands | type `/` then ↑↓ · Tab · Enter |
| Palette | `Ctrl+P` |
| Voice into input | `Ctrl+R` |
| Connect provider | `/connect` |
| Pick model | `/models` or `/model openai/gpt-4.1-mini` |
| Plans | `/plans` or Tab |

API keys stay in `~/.voxiva/auth.json` (or use env: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`).

## Plans

`build` · `ship` · `check` · `explore`

## Security

See [SECURITY.md](SECURITY.md). Never commit API keys. Install scripts only run `npm install`, `build`, and `npm link` in this folder.

## License

MIT — [LICENSE](LICENSE)

## Org

GitHub: [voxiva-ai](https://github.com/voxiva-ai) · Display: **Voxi.ly** · Brand: Voxiva
