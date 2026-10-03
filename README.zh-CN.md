<p align="center">
  <b>Voxiva CLI</b><br/>
  终端编程助手 · 免费模型 · 文件修改需确认
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

## 安装

复制**一条**命令即可。没有 Node 时会自动从官方 / **npmmirror** 下载到 `~/.voxiva/runtime`，再安装 CLI。开源代码在 GitHub，全部公开。

**推荐（国内网络，jsDelivr 镜像）**
```bash
curl -fsSL https://cdn.jsdelivr.net/gh/voxiva-ai/cli@main/install | bash
```
```powershell
irm https://cdn.jsdelivr.net/gh/voxiva-ai/cli@main/install.ps1 | iex
```

也可强制国内镜像：`VOXIVA_REGION=cn`（bash）或 `$env:VOXIVA_REGION="cn"`（PowerShell）。

**GitHub 直连**
```bash
curl -fsSL https://raw.githubusercontent.com/voxiva-ai/cli/main/install | bash
```
```powershell
irm https://raw.githubusercontent.com/voxiva-ai/cli/main/install.ps1 | iex
```

然后打开**新**终端：

```bash
voxiva --version && voxiva doctor
```

**已有 Node 20+？**
```bash
npm install -g github:voxiva-ai/cli
```

---

## 开始

```bash
voxiva
```

默认 **免费模型**，无需 API Key。输入内容后按 Enter。

| | |
|--|--|
| 切换模型 | `/models` — Big Pickle、Space Bunny、Nemotron… **无需密钥** |
| 付费（GPT / Claude / Gemini） | `/models` → 选厂商 → 粘贴密钥 |
| 更多免费（OpenRouter） | `/connect` → OpenRouter → 粘贴免费密钥 |
| 切换计划 | `Tab` 或 `/plans` |
| 继续上次对话 | `/continue` |
| 退出 | `Ctrl+C` |

---

## 快捷键

| | |
|--|--|
| 粘贴 | `Ctrl+V` → 图片/长文本显示为卡片 |
| 复制上一条回复 | `Ctrl+Y` / `/copy` |
| 移除卡片 | 输入为空时按 `Backspace` |
| 滚动聊天 | 鼠标滚轮 · `PgUp`/`PgDn` · 输入为空时 `↑`/`↓` |
| 切换目录 | `cd /path/to/project` |
| Shell | `!git status` · `!ls` |
| 附加文件/图片 | `@路径`，或复制文件后 `Ctrl+V` |
| 命令 | `/` → 完整列表 · 输入过滤 |
| 停止生成 | `Esc` |
| 应用 / 跳过修改 | `y` / `n` |

---

## 命令

`/model` · `/plans` · `/continue` · `/sessions` · `/workspaces` · `/files` · `/history` · `/copy` · `/undo` · `/memory` · `/init` · `/diff` · `/cost` · `/themes` · `/lang` · `/shortcuts` · `/help`

---

## 说明

- **免费模型**不扣费；API Key 用 `/connect`
- 安装程序将 Node + CLI 放在 `~/.voxiva/`（`runtime/`、`prefix/`、`bin/`）
- 数据：同目录下的 `config.json`、`auth.json`、`sessions.json`
- 卸载：删除 `~/.voxiva` 并从 PATH 移除

MIT · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)
