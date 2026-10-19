# Voxiva CLI Desktop

The desktop app opens a centered coding chat with model and plan selection, reviewable file changes, saved sessions, recent projects, shared theme and reply-language settings, and searchable quick actions (`Ctrl+K`). The embedded terminal keeps the full Voxiva CLI TUI and all CLI commands available. Chat and terminal share the CLI's provider, session, workspace, and preference stores. It bundles Node.js and runs on Windows, macOS, and Linux without requiring Swift or a system Node.js installation.

## Develop

From the repository root:

```bash
npm ci
npm run desktop:install
npm run desktop
```

Open a project folder in the app. Provider keys, saved sessions, themes, and other settings use the same `~/.voxiva/` directory as the CLI. The packaged app includes Electron and Node.js, so it does not rely on Swift or a system Node installation.

Open **Models & providers** from the Voxiva button to add or remove a provider key; keys remain on the device and are never shown back in full. Choose a model in the composer and an agent plan in the top bar. The sidebar restores recent project chats after restart. Settings are shared with the CLI, so changing the theme or reply language in either place affects both.

The app checks GitHub Releases on startup and offers an update when a newer version is available. A manual check is in the quick actions palette. Downloading starts only after you choose **Download update**; the app saves the matching installer in your Downloads folder and opens it only after a second explicit click. Windows opens the NSIS installer and Linux opens the downloaded AppImage. macOS and unsupported platforms or architectures open the release page to download the installer manually. The current app stays usable if GitHub is unavailable.

## Package

```bash
npm run desktop:dist
```

The output is written to `apps/desktop/release/`. Build on the target OS for its native installer. The GitHub Actions workflow tests and builds Windows, macOS, and Linux artifacts independently; a `v*` tag matching the root CLI package version attaches all installers to a GitHub Release and synchronizes the desktop package version. macOS builds are unsigned until Apple signing and notarization credentials are configured, so Gatekeeper may require the user to approve or install the app manually.
