# Voxiva Desktop navigation design

## Intent
Bring the desktop app navigation closer to the supplied OpenCode references while keeping Voxiva branding and the existing dark/light visual system. The app should feel like one full-width window with a smoothly sliding sidebar, a tab strip, compact anchored menus, and project/workspace controls that work.

## Goals
- Add a native-feeling top navigation strip with app menu, session tabs, close/new-tab controls, and an update affordance.
- Make sidebar collapse/expand animate smoothly without hiding it from accessibility or keyboard navigation.
- Replace the project modal as the primary picker with a searchable anchored menu listing recent projects and Add project.
- Replace the static Local label with a menu for Local repository and New worktree.
- Reuse the existing desktop update service and dialog; expose it from a top-bar icon when an update is available and retain manual update access from the menu.
- Keep existing model and plan controls, session persistence, keyboard shortcuts, theme, and terminal behavior working.

## Non-goals
- Frameless/custom native window chrome, browser-style web navigation, multi-window session synchronization, or deleting worktrees.
- Replacing existing model providers, chat APIs, update downloader, or saved session format.

## Decisions and behavior
- Keep Electron's native title bar. Add app-level menu button and document-level session tabs below it, matching reference hierarchy without changing OS window controls.
- Open tabs represent saved sessions in the active project plus the current draft. Clicking switches to the selected saved session. Closing a tab only removes it from the open tab strip and never deletes saved history. Keep a draft tab available if the last tab is closed.
- Keep project selection scoped to the existing project/workspace services. The searchable popover lists recent folders, marks the active one, and ends with Add project to invoke the existing native folder picker.
- The environment menu shows Local repository and returns from a worktree to the repository's main checkout. New worktree creates an isolated Git worktree in a sibling directory with a generated branch/name and switches the active project to it. It must refuse non-Git projects and collisions, and never overwrite or delete data. If creation fails, keep current project/session selected and show the error. If the source checkout has uncommitted changes, tell the user those changes remain in the source folder.
- The update icon appears only when the existing update check reports a supported available release. Clicking opens the existing centered update dialog. The menu also exposes Check for updates so checks can be initiated manually.
- App menu entries must invoke existing working actions: new chat, choose project, terminal, sidebar toggle, theme, update check, and app info. Do not render inert menu rows.
- Use the house popover style/patterns and existing CSS variables. Menus support Escape, outside click, keyboard focus, accessible labels, and reduced motion.

## Constraints and impact
- Renderer changes in `apps/desktop/index.html`, `renderer.js`, and `styles.css`; bridge additions only if needed; Electron main-process changes for safe worktree creation; focused desktop tests/fixtures for worktree behavior and existing renderer wiring.
- Existing session service is single-active-session in the main process. Tab switching must use its open-session API and not run multiple concurrent chats. Switching tabs should stop an in-flight response using the same existing behavior as opening a session.
- Do not clear saved sessions on tab close. Worktree creation must use the selected project as cwd and validate Git status before filesystem changes.
- No new runtime dependency.

## Builder choices
- Use a concise generated branch `voxiva/<slug>` and sibling folder `<repo>-<slug>`; ask no extra questions. If the repo has uncommitted changes, Git worktree can still be created from HEAD but the UI should state that uncommitted changes remain in the original folder.
- Keep existing workspace modal available as a fallback only if the new project popover cannot fit narrow windows; primary selection remains the anchored searchable menu.
- The tab strip only shows the current project’s open tabs; project switches reset the strip to its last/current session rather than mixing sessions from unrelated projects.
