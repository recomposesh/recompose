# 0136: A packaged run attaches no window input guard

**Status**: Accepted
**Date**: 2026-08-17

## Context

The View menu prints a reload keystroke that `optimizer.watchWindowShortcuts` swallowed in
packaged builds: the toolkit's packaged branch exists to eat `CmdOrCtrl+R` and the devtools
chord. macOS offers no way to print an accelerator without registering it, so the guard and the
menu contradicted each other.

## Decision

The guard call runs only in a development run, through `window-shortcut-guard.ts`. A packaged run
attaches no `before-input-event` listener at all, so the printed reload keystroke lives by
construction. Force Reload and Toggle DevTools leave the packaged View menu entirely and stay
development rows, the same branch the tray already takes. A node-side spec pins both wirings, and
the physical press on a packaged artifact stays a named manual check.

## Alternatives

- **Keeping the guard and deleting the printed chords**: rejected because the roles supply their
  accelerators and macOS ignores attempts to blank them.
- **Replacing the guard with `setIgnoreMenuShortcuts`**: rejected because the goal is live menu
  shortcuts, not deader ones.
- **Keeping `{ zoom: true }` semantics with an owned listener**: rejected because the flag
  already exempts the zoom chords today, so removal changes nothing for them.

## Consequences

**Good**: every keystroke the packaged menu prints fires, and Chromium's own page-zoom chords
stay exactly as reachable as today.

**Bad**: a packaged reload becomes reachable from the keyboard, which the app tolerates because
state persists continuously. The packaged press check stays manual, because the harness's menu
click bypasses the input path.
