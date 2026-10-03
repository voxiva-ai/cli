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

Одна команда — если нет Node.js, **скачает официальный** в `~/.voxiva/runtime`, потом поставит CLI.

**macOS / Linux**
```bash
curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash
```

**Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex
```

Открой новый терминал:

```bash
voxiva --version && voxiva doctor
```

**Уже есть Node 20+?**
```bash
npm install -g @voxiva/cli
# или: npm install -g github:voxiva-ai/cli
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

- **Free**-модели без оплаты; API-ключи — `/connect`
- Установщик кладёт Node + CLI в `~/.voxiva/` (`runtime/`, `prefix/`, `bin/`)
- Данные: `config.json`, `auth.json`, `sessions.json` там же
- Удалить: папку `~/.voxiva` и запись из PATH

MIT · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)
