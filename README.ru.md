<p align="center">
  <b>Voxiva CLI</b><br/>
  Терминальный coding-агент · бесплатные модели · правки файлов с подтверждением
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

## Установка

Скопируй **одну** команду. Если нет Node.js — скачает (официал + зеркала), поставит CLI. Открытый код на GitHub — всё публично.

**macOS / Linux**
```bash
curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash
```

**Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex
```

**Если GitHub тормозит / недоступен** (зеркало jsDelivr):
```bash
curl -fsSL https://cdn.jsdelivr.net/gh/voxiva-ai/cli@main/install | bash
```
```powershell
irm https://cdn.jsdelivr.net/gh/voxiva-ai/cli@main/install.ps1 | iex
```

Открой **новый** терминал:

```bash
voxiva --version && voxiva doctor
```

**Уже есть Node 20+?**
```bash
npm install -g github:voxiva-ai/cli
```

---

## Запуск

```bash
voxiva
```

Сразу работает **бесплатная модель** без API-ключа. Пишешь → Enter.

| | |
|--|--|
| Модель | `/models` — Big Pickle, Space Bunny, Nemotron… **без ключа** |
| Платные (GPT / Claude / Gemini) | `/models` → провайдер → вставить ключ |
| Ещё free (OpenRouter) | `/connect` → OpenRouter → бесплатный ключ |
| План | `Tab` или `/plans` |
| Продолжить чат | `/continue` |
| Выход | `Ctrl+C` |

---

## Клавиши

| | |
|--|--|
| Вставить | `Ctrl+V` → карточка для фото / длинного текста |
| Скопировать ответ | `Ctrl+Y` / `/copy` |
| Убрать карточку | `Backspace` (если поле пустое) |
| Листать чат | колёсико · `PgUp`/`PgDn` · `↑`/`↓` (если поле пустое) |
| Сменить папку | `cd D:\path` |
| Shell | `!git status` · `!dir` |
| Файл / фото | `@путь` или скопировать файл → `Ctrl+V` |
| Команды | `/` → полный список · печатай для фильтра |
| Стоп | `Esc` |
| Применить / пропустить правку | `y` / `n` |

---

## Команды

`/model` · `/plans` · `/continue` · `/sessions` · `/workspaces` · `/files` · `/history` · `/copy` · `/undo` · `/memory` · `/init` · `/diff` · `/cost` · `/themes` · `/lang` · `/shortcuts` · `/help`

---

## Важно

- **Free**-модели как в OpenCode Zen, без ключа; API — `/connect`
- Новый ПК: установщик сам качает Node + CLI и гоняет `doctor`
- Всё лежит в `~/.voxiva/` — удалить папку + PATH

MIT · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)
