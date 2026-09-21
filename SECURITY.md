# Security

## Reporting

If you find a security issue in Voxiva CLI, email **security@voxiva.ai** (or open a private GitHub security advisory on this repo). Don’t post API keys or private chat logs in public issues.

## What we store locally

| Path | Contents |
|------|----------|
| `~/.voxiva/config.json` | Plan, theme, default model |
| `~/.voxiva/auth.json` | Provider API keys (file mode `0600` on Unix) |
| `~/.voxiva/sessions.json` | Chat history |

Keys never leave your machine except when calling the provider you chose.

## Safe install

- Prefer `npm install -g @voxiva/cli` once published, or clone this repo and run the install scripts.
- Don’t paste API keys into issues, Discord, or screenshots.
- Prefer env vars (`OPENAI_API_KEY`, …) in CI; use `/connect` only on your own machine.
- Review `scripts/install.ps1` / `scripts/install.sh` before running them from an unknown fork.

## Scope

This CLI talks to third-party model APIs. Their terms and data policies apply to prompts you send.
