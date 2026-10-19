# Voxiva Desktop CLI Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Make the desktop app a reliable graphical front end for Voxiva CLI features, sharing providers, models, projects, sessions, settings, diagnostics, and update channels.

**Architecture:** Keep `src/` as the shared source of behavior and use Electron main-process IPC as the only bridge to the renderer. Retain the embedded CLI terminal for commands and advanced TUI operations without a native screen. Use the existing shared stores rather than introducing app-only copies.

**Tech Stack:** Electron 44, CommonJS main/preload, browser renderer, packaged `@voxiva/cli`, node:test, GitHub Actions Releases.

**Spec:** `docs/superpowers/specs/2026-10-19-desktop-cli-parity-design.md`

## Global Constraints

- Keep Windows, macOS, and Linux support and the bundled Node.js runtime.
- Keep CLI storage paths and formats compatible; use `~/.voxiva` stores.
- Keep secrets in the main process; never send raw keys to the renderer or logs.
- Validate every renderer-to-main IPC input and preserve project-path checks and edit review.
- Keep terminal access to every existing CLI and TUI command.
- CLI updates and desktop binary updates remain distinct; desktop builds are published through GitHub Releases.
- Do not add a dependency unless the existing Electron/CLI APIs cannot implement the needed behavior safely.

## Review Focus

- Invalid or oversized IPC inputs: reject without changing configuration or files; cover in provider/session IPC tests.
- Provider key replacement/removal: refresh model availability and never echo the secret; cover in provider store tests.
- App restart or switching project during an active response: persist only completed turns and restore the chosen session/project; cover in session lifecycle tests.
- Missing network, malformed release metadata, or unsupported updater platform: leave the current app usable and show an actionable result; cover in update-check tests.
- macOS unsigned builds and Windows ARM/Linux ARM artifacts: publish platform-correct assets and avoid promising unsupported silent install; cover release selection/metadata tests and workflow validation.

---

### Task 1: Provider settings and model parity

**Files:**
- Modify: `apps/desktop/main.cjs` (provider/model IPC and `app:state`)
- Modify: `apps/desktop/preload.cjs` (narrow typed bridge methods)
- Modify: `apps/desktop/index.html` (settings dialog markup)
- Modify: `apps/desktop/renderer.js` (provider form, model refresh, settings navigation)
- Modify: `apps/desktop/styles.css` (matching dialog and provider rows)
- Create: `apps/desktop/provider-service.cjs` (validated, testable provider/model operations)
- Test: `apps/desktop/test/provider-settings.test.cjs`

**Interfaces:**
- `app:state` returns model refs/labels, plan, theme, locale, and provider IDs with connected/masked state only.
- `createProviderHandlers({ loadAuth, saveAuth, providerIds, catalog })` returns `state()`, `save({ id, apiKey })`, and `remove(id)` methods.
- `state()` returns safe provider metadata, model refs/labels, plan, theme, and locale, never raw key material.
- `save()` validates known provider ID and non-empty key up to 4096 characters before calling shared `saveAuth`; `remove()` accepts only a known ID.

- [x] **Step 1: Add failing tests** for unknown provider rejection, empty/oversized key rejection, masked listing, save/remove, and refreshing catalog availability after provider changes through `createProviderHandlers`.
- [x] **Step 2: Run** `node --test apps/desktop/test/provider-settings.test.cjs`; confirm it fails because provider IPC/service is missing.
- [x] **Step 3: Implement** the smallest shared main-process service and IPC handlers using `loadAuth`, `saveAuth`, `listCatalog`, and existing model usability checks.
- [x] **Step 4: Implement** a compact Voxiva settings dialog with provider URLs, masked connection status, add/replace/remove actions, accessible labels, validation errors, and working close/back behavior.
- [x] **Step 6: Run** `node --test apps/desktop/test/provider-settings.test.cjs` and the desktop stream tests.
- [x] **Step 7: Commit** the provider settings deliverable.

### Task 2: Persisted chat sessions and project history

**Files:**
- Modify: `apps/desktop/main.cjs` (session/workspace handlers and chat lifecycle)
- Modify: `apps/desktop/preload.cjs` (session/workspace bridge)
- Modify: `apps/desktop/index.html` (session list and project picker affordances)
- Modify: `apps/desktop/renderer.js` (restore, create, and switch session interactions)
- Modify: `apps/desktop/styles.css` (session rows and empty states)
- Create: `apps/desktop/session-service.cjs` (project-scoped session persistence contract)
- Test: `apps/desktop/test/session-lifecycle.test.cjs`

**Interfaces:**
- `workspace:list` returns only existing paths and labels using `listWorkspaces`.
- `session:list` returns safe summaries from `listSessionsForCwd(cwd)`.
- `session:open` validates the ID and returns a bounded record from `getSession(id)`.
- `createSessionHandlers({ sessions, getCurrentProject })` owns project-scoped list/open/save; lists omit message bodies and saves keep the latest 40 user/assistant messages.
- `chat:new` creates a new session ID; completed turns are saved through `saveSession` with cwd/model/plan/messages.
- Streaming/incomplete turns are not persisted as completed assistant replies; switching projects aborts the active request before restoration.

- [x] **Step 1: Add failing tests** for session creation, completed-turn persistence, session restore, cwd filtering, and safe rejection of malformed/missing IDs.
- [x] **Step 2: Run** `node --test apps/desktop/test/session-lifecycle.test.cjs`; confirm missing persistence behavior.
- [x] **Step 3: Implement** handlers with shared `sessions/store.ts` and `workspaces/store.ts`, preserving the current user data format and limits.
- [x] **Step 4: Implement** the sidebar session/project lists and connect every row/button to the matching handler; show empty, missing-project, and load-error states.
- [x] **Step 6: Run** session lifecycle and stream tests; verify selection survives renderer refresh and session content is restored in order.
- [x] **Step 7: Commit** the session/project history deliverable.

### Task 3: Shared preferences, command actions, and diagnostics

**Files:**
- Modify: `apps/desktop/main.cjs` (theme/locale, doctor, common action IPC)
- Modify: `apps/desktop/preload.cjs` (preferences/diagnostic bridge)
- Modify: `apps/desktop/index.html` (settings sections, command palette, diagnostics view)
- Modify: `apps/desktop/renderer.js` (commands, preferences, status feedback)
- Modify: `apps/desktop/styles.css` (preferences/palette/diagnostic states)
- Test: `apps/desktop/test/app-actions.test.cjs`

**Interfaces:**
- `app:preferences` reads/writes shared `theme` and `locale` through `loadConfig`/`patchConfig`.
- `app:doctor` returns structured status for runtime, provider/model, project, and update channel without secrets.
- Frequent slash equivalents (`new`, `models`, `plans`, `connect`, `sessions`, `workspaces`, `doctor`, `update`) are available through visible controls or a searchable command palette.
- Advanced TUI-only commands continue to work through the embedded terminal.

- [x] **Step 1: Add failing tests** for persisted `auto`/dark/light theme choice, supported locale validation, safe doctor output, and exact command-palette dispatch results.
- [x] **Step 2: Run** `node --test apps/desktop/test/app-actions.test.cjs`; confirm unsupported or missing actions fail.
- [x] **Step 3: Implement** preference and diagnostic IPC using existing config/provider/update helpers; do not duplicate business logic.
- [x] **Step 4: Implement** renderer controls and command palette; replace decorative or toast-only controls with their real action or a disabled state with explanation.
- [x] **Step 5: Run** action, provider, and session tests plus desktop stream tests.
- [x] **Step 6: Commit** the shared settings and diagnostics deliverable.

### Task 4: Desktop release updates

**Files:**
- Modify: `apps/desktop/main.cjs` (release check/download/install orchestration)
- Modify: `apps/desktop/preload.cjs` (update state/progress/cancel bridge)
- Modify: `apps/desktop/index.html` (centered Voxiva update dialog)
- Modify: `apps/desktop/renderer.js` (check on launch, manual check, confirm, progress, restart)
- Modify: `apps/desktop/styles.css` (update dialog and progress states)
- Modify: `apps/desktop/package.json` and `apps/desktop/package-lock.json` only if platform updater support requires a dependency
- Modify: `.github/workflows/desktop.yml` (tag-triggered release publishing)
- Modify: `apps/desktop/README.md` (release/update behavior)
- Test: `apps/desktop/test/update-flow.test.cjs`

**Interfaces:**
- `update:check` returns `{ current, latest, available, assets, supportedAction }` from validated GitHub release metadata.
- `update:download` runs only after user confirmation and reports bounded progress without blocking chat.
- `update:open` is enabled only after a completed download; unsupported installs open the matching GitHub release page. The downloaded installer is opened only after a second user action.
- A version tag builds all existing OS/architecture targets, publishes installers and update metadata to one GitHub Release, and fails if an expected asset is absent.

- [x] **Step 1: Add failing tests** for version comparison, malformed/no-network release responses, platform/architecture asset choice, cancellation, and the macOS manual-install fallback.
- [x] **Step 2: Run** `node --test apps/desktop/test/update-flow.test.cjs`; confirm the update service is missing.
- [x] **Step 3: Implement** the minimal release client and platform update adapter, reusing Electron updater support only where automatic installation is supported by the current packaging/signing setup.
- [x] **Step 4: Implement** the centered branded update dialog and ensure checks are low-frequency, cancellable, and never auto-install without confirmation.
- [x] **Step 6: Change** the workflow to publish only on version tags while retaining the existing CI artifact workflow; validate release asset names match the selector.
- [x] **Step 7: Run** updater tests, desktop packaging smoke tests, the desktop test suite, and the CLI test suite.
- [x] **Step 8: Commit** the update flow and release-pipeline deliverable.

### Task 5: End-to-end desktop verification and documentation

**Files:**
- Modify: `apps/desktop/test/packaged-smoke.cjs` if added runtime files need checks
- Modify: `apps/desktop/README.md`
- Modify: `README.md` and `README.ru.md` only where desktop feature/setup details are outdated

- [x] **Step 1: Add failing packaged smoke assertions** for settings/session/update resources and bridge exposure.
- [x] **Step 2: Run** the packaged smoke test and confirm it detects any missing packaged resource.
- [x] **Step 3: Fix** packaging declarations and document provider setup, sessions, update prompt, restart requirements, and full CLI access through the terminal.
- [x] **Step 4: Run** `npm test`, desktop tests, `npm run desktop:prepare`, `npm run dist:dir --prefix apps/desktop`, and `npm run smoke:packaged --prefix apps/desktop`.
- [x] **Step 5: Commit** final verification and documentation.
