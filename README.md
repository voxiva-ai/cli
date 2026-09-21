# Voxiva CLI

Terminal coding agent from [Voxiva](https://github.com/voxiva-ai).

Connect OpenAI, Anthropic, OpenRouter, Groq, or Google. Switch plans. Chat in the terminal.

## Install

Needs **Node.js 20+**.

### Windows

```powershell
git clone https://github.com/voxiva-ai/cli.git
cd cli
.\scripts\install.ps1
```

### macOS / Linux

```bash
git clone https://github.com/voxiva-ai/cli.git
cd cli
chmod +x scripts/install.sh
./scripts/install.sh
```

### Without scripts

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

Later, from npm:

```bash
npm install -g @voxiva/cli
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
| Provider | `/connect` |
| Model | `/models` or `/model openai/gpt-4.1-mini` |
| Plans | `/plans` or Tab |

Keys: `~/.voxiva/auth.json` or env `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`.

## Plans

`build` · `ship` · `check` · `explore`

## Security

See [SECURITY.md](SECURITY.md). Don’t commit API keys.

## License

MIT — [LICENSE](LICENSE)
