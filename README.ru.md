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
# или: npm install -g github:voxiva-ai/cli
```

```bash
voxiva --version && voxiva doctor
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

- **Free**-модели не снимают деньги
- При запуске проверяются обновления (баннер, если есть новая версия)
- Данные: `~/.voxiva/` (Windows: `%USERPROFILE%\.voxiva\`)
- Удалить: `npm uninstall -g @voxiva/cli`

MIT · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)
