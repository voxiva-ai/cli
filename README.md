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

Or download and extract the ZIP, then double-click `install.cmd`. It installs into the current user profile and does not require administrator rights.

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

A limited **keyless fallback** works immediately. For reliable free chat, connect an OpenCode Zen key with `/connect`.

| | |
|--|--|
| OpenCode Zen free models | `/connect` → OpenCode Zen → key from `opencode.ai/auth` |
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

`/model` · `/update` · `/plans` · `/continue` · `/sessions` · `/workspaces` · `/files` · `/history` · `/copy` · `/undo` · `/memory` · `/init` · `/diff` · `/cost` · `/themes` · `/lang` · `/shortcuts` · `/help`

---

## Update

When a newer version is on GitHub, the app asks before the first task:

```text
Update available · Enter/U update now · N/Esc later
```

The check runs in the background, is cached for one hour, and never blocks offline startup.

**Users**
```bash
voxiva update
# or inside chat: /update   (or press u)
```

Same as reinstall:
```powershell
irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex
```

**Maintainers (so others get the banner)** — bump version, push `main`:
```bash
# edit package.json + src/tui/copy.ts VERSION together (e.g. 0.1.2 → 0.1.3)
git add -A && git commit -m "Release 0.1.2" && git push
# optional GitHub Release tag:
gh release create v0.1.2 -t "v0.1.2" -n "What's new"
```

Users pick up the new `package.json` version from `main` (no npm publish required).

---

## Notes

- **Free** models use OpenCode Zen directly; a rate-limited anonymous fallback remains available
- **API keys** via `/connect` — OpenCode Zen / OpenAI / Anthropic / Google / OpenRouter
- New PC: installer downloads Node (official / npmmirror / winget) + CLI
- Update: `voxiva update` · app offers it automatically
- Files under `~/.voxiva/` (`runtime/`, `prefix/`, `bin/`, config, sessions)
- Uninstall: delete `~/.voxiva` and remove it from PATH

MIT · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)
