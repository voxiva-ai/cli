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

Или скачай ZIP, распакуй и запусти `install.cmd` двойным кликом. Установка идет в профиль пользователя и не требует прав администратора.

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

Сразу доступен резервный **бесплатный режим без ключа**. Для стабильной переписки подключи бесплатный ключ OpenCode Zen через `/connect`.

| | |
|--|--|
| Free-модели OpenCode Zen | `/connect` → OpenCode Zen → ключ с `opencode.ai/auth` |
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

`/model` · `/update` · `/plans` · `/continue` · `/sessions` · `/workspaces` · `/files` · `/history` · `/copy` · `/undo` · `/memory` · `/init` · `/diff` · `/cost` · `/themes` · `/lang` · `/shortcuts` · `/help`

---

## Обновление

Когда на GitHub выходит новая версия, в приложении баннер: `↑ Update · press u or /update`

```bash
voxiva update
```

Или снова одна команда установки. Чтобы другие увидели обновление — подними `version` в `package.json` + `src/tui/copy.ts` и сделай `git push` на `main`.

---

## Важно

- **Free**-модели идут напрямую через OpenCode Zen; без ключа остается ограниченный резервный шлюз
- Новый ПК: установщик сам качает Node + CLI и гоняет `doctor`
- Всё лежит в `~/.voxiva/` — удалить папку + PATH

MIT · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)
