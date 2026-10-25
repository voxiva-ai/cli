# Desktop navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match the desktop navigation interactions in the screenshots with smooth sidebar, session tabs, searchable project picker, worktree selector, and working update access.

**Architecture:** Keep the existing Electron main/preload/renderer split and reuse current project, session, update, and popover patterns. Add a small Git worktree service behind a validated IPC handler; keep open tabs renderer-side and session persistence unchanged.

**Tech Stack:** Electron, vanilla JS, HTML/CSS, Node.js built-in `node:test`, Git CLI.

**Spec:** `docs/superpowers/specs/2026-10-25-desktop-navigation-design.md`

## Global Constraints
- Keep Electron's native title bar.
- No runtime dependencies.
- Tab close must never delete saved sessions.
- Worktree creation must refuse non-Git projects and collisions, never overwrite or delete data.
- Existing chat/session/update services remain the source of truth.

## Review Focus
- Non-Git folder or invalid Git root must fail before creating files; add service tests.
- Existing branch/directory name collisions must fail without modifying the repo; add service tests.
- Switching/closing tabs must preserve saved sessions; verify renderer action logic.
- Update not available/unsupported must not show a misleading available badge; verify status handling.
- Narrow viewport and reduced-motion preference must keep menus usable; verify CSS breakpoints and motion rules.

## Files
- Modify `apps/desktop/index.html`, `renderer.js`, and `styles.css` for navigation controls, tabs, menus, picker, and motion.
- Modify `apps/desktop/main.cjs` and `preload.cjs` for an allowlisted worktree creation IPC.
- Create `apps/desktop/worktree-service.cjs` with Git process handling and collision checks.
- Create `apps/desktop/test/worktree-service.test.cjs` for Git-backed temp-repo coverage.
- Update package builder `files` only if the service is not already included by its current manifest.

### Task 1: Safe worktree creation

**Interfaces:** `createWorktree({ cwd, name }) -> Promise<{ cwd, branch, hasChanges }>` and `getMainWorktree(cwd) -> Promise<string>`; throw actionable errors for non-Git directories, invalid names, or branch/path collisions. Git subprocesses are asynchronous so the Electron main process stays responsive.

- [ ] Add tests for creating a sibling worktree/branch, reporting uncommitted files, returning the main checkout, rejecting non-Git directory, and rejecting branch/path collision without changing existing paths.
- [ ] Run `npm test -- --test-name-pattern worktree` from `apps/desktop` and confirm the missing service fails.
- [ ] Implement minimal service using `git rev-parse`, validate repo root, derive sanitized slug and unique branch/folder, then `git worktree add -b`.
- [ ] Add validated `workspace:create-worktree` IPC and preload method; activate workspace only after successful creation.
- [ ] Run focused worktree tests and complete desktop suite.

### Task 2: Unified navigation controls

- [ ] Add accessible top tab strip markup: menu, active session tab, close, plus, update icon; add hidden anchored app menu, searchable project menu, and environment menu.
- [ ] Add renderer tests/assertions if existing test harness supports DOM; otherwise keep behavior in named renderer handlers and verify with desktop tests plus manual launch.
- [ ] Wire menu actions to existing new chat, project chooser, terminal, sidebar, theme, update check, and diagnostics/info actions. All rows must act.
- [ ] Wire tabs to existing session list/open APIs; current draft is retained, closing a tab never deletes persistence, and switching tabs uses existing stop/open behavior.
- [ ] Wire searchable project picker to recent workspace list and existing folder picker. Keep workspace dialog available only as a fallback if required by narrow viewport behavior.
- [ ] Wire Local repository / New worktree selector to current project and safe creation IPC; show an error and retain selection on failure.
- [ ] Wire update badge to startup/manual check result and existing update dialog; only display for supported available updates.
- [ ] Run desktop tests and launch desktop app for visual/interaction smoke check at full and narrow widths.

### Task 3: Cohesive styling and responsive behavior

- [ ] Replace `display:none` sidebar toggle with a width/flex transition and inert/visibility state that preserves accessibility; honor `prefers-reduced-motion`.
- [ ] Style tab strip, flyouts, search fields, selected checkmarks, separators, update dot, focus rings, and hover states with existing theme variables and Voxiva palette.
- [ ] Check keyboard Escape/outside dismissal, tab order, and responsive overflow manually.
- [ ] Run `npm test` in `apps/desktop`; inspect `git diff --check` and confirm no unrelated files changed.

## Execution
Implement task-by-task in this worktree. Do not merge main. Existing user authorization covers pushing the feature branch after completion.
