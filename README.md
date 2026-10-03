<p align="center">
  <b>Voxiva CLI</b><br/>
  Terminal coding agent · free models · file edits with approval
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.ru.md">Русский</a>
</p>

<p align="center">
  <b>Beta v0.1.0</b> · Node.js 20+
</p>

---

## Install

Copy **one** command. It downloads Node.js (official + mirrors) if missing, then installs the CLI. Works in EN / RU / CN networks — mirrors kick in automatically when GitHub or npmjs is slow.

**macOS / Linux**
```bash
curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash
```

**Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex
```

**If GitHub is blocked/slow (often China)** — same installer via jsDelivr:
```bash
curl -fsSL https://cdn.jsdelivr.net/gh/voxiva-ai/cli@main/install | bash
```
```powershell
irm https://cdn.jsdelivr.net/gh/voxiva-ai/cli@main/install.ps1 | iex
```

Force China mirrors: `VOXIVA_REGION=cn` (bash) or `$env:VOXIVA_REGION="cn"` (PowerShell) before the command.

Then open a **new** terminal:

```bash
voxiva --version && voxiva doctor
```

**Already have Node 20+?**
```bash
npm install -g github:voxiva-ai/cli
```

---

## Start

```bash
voxiva
```

Free model works with **no API key**. Type → Enter.

| | |
|--|--|
| Free models | `/models` — Big Pickle, Space Bunny, Nemotron… **no key** |
| Paid (GPT / Claude / Gemini) | `/models` → provider → paste key |
| More free (OpenRouter) | `/connect` → OpenRouter → free key unlocks real free endpoints |
| Plan | `Tab` or `/plans` |
| Resume | `/continue` |
| Exit | `Ctrl+C` |

---

## Shortcuts

| | |
|--|--|
| Paste | `Ctrl+V` → chip for image / long text |
| Copy last reply | `Ctrl+Y` / `/copy` |
| Remove chip | `Backspace` (empty input) |
| Scroll | mouse wheel · `PgUp`/`PgDn` · `↑`/`↓` (empty input) |
| Change folder | `cd /path/to/project` |
| Shell | `!git status` · `!ls` |
| Attach file/image | `@path` or copy file → `Ctrl+V` |
| Commands | `/` → full list · type to filter |
| Stop | `Esc` |
| Apply / skip edit | `y` / `n` |

---

## Commands

`/model` · `/plans` · `/continue` · `/sessions` · `/workspaces` · `/files` · `/history` · `/copy` · `/undo` · `/memory` · `/init` · `/diff` · `/cost` · `/themes` · `/lang` · `/shortcuts` · `/help`

---

## Notes

- **Free** models = no billing on the free path (fast streaming)
- **API keys** via `/connect` — OpenAI / Anthropic / Google / OpenRouter (cached clients, streamed)
- Installer stores Node + CLI under `~/.voxiva/` (`runtime/`, `prefix/`, `bin/`)
- Data: `~/.voxiva/` (`config.json`, `auth.json`, `sessions.json`)
- Uninstall: delete `~/.voxiva` and remove it from PATH

MIT · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)
