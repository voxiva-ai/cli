# Voxiva CLI Desktop

The desktop app opens a centered coding chat with model and plan selection, reviewable file changes, and a separate embedded terminal for the full Voxiva CLI TUI. Chat and terminal share the CLI's provider configuration and project workspace. It uses Electron and node-pty, bundles its own Node.js runtime, and runs on Windows, macOS, and Linux without requiring Swift or a system Node.js installation.

## Develop

From the repository root:

```bash
npm ci
npm run desktop:install
npm run desktop
```

Open a project folder in the app. Provider keys, saved sessions, themes, and other settings use the same `~/.voxiva/` directory as the CLI. The packaged app includes Electron and Node.js, so it does not rely on Swift or a system Node installation.

## Package

```bash
npm run desktop:dist
```

The output is written to `apps/desktop/release/`. Build on the target OS for its native installer. The GitHub Actions workflow builds Windows, macOS, and Linux artifacts independently. macOS builds are unsigned until Apple signing and notarization credentials are configured.
