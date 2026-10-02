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

**macOS / Linux**
```bash
curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash
```

**Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex
```

**npm**
```bash
npm install -g @voxiva/cli
# or: npm install -g github:voxiva-ai/cli
```

```bash
voxiva --version && voxiva doctor
```

---

## Start

```bash
voxiva
```

Free model works with **no API key**. Type → Enter.

| | |
|--|--|
| Free models | `/model` — Free Coding works with **no key** |
| Paid (GPT / Claude / Gemini) | `/model` → provider → paste key |
| More free (OpenRouter) | `/model` → OpenRouter → paste free key |
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
| Palette | `/` or `Ctrl+P` |
| Stop | `Esc` |
| Apply / skip edit | `y` / `n` |

---

## Commands

`/model` · `/plans` · `/continue` · `/sessions` · `/workspaces` · `/files` · `/history` · `/copy` · `/undo` · `/memory` · `/init` · `/diff` · `/cost` · `/themes` · `/lang` · `/shortcuts` · `/help`

---

## Notes

- **Free** models = no billing on the free path
- Updates check on launch (banner if newer release)
- Data: `~/.voxiva/` (`config.json`, `auth.json`, `sessions.json`)
- Uninstall: `npm uninstall -g @voxiva/cli`

MIT · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)
