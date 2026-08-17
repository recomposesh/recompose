## Research brief: app-menu-shortcuts (tier full)

Scope read: `openspec/changes/app-menu-shortcuts/proposal.md`, `openspec/changes/app-menu-shortcuts/specs/app-menu/spec.md`, `openspec/changes/app-menu-shortcuts/specs/usage/spec.md`. Everything below is either an official doc, a third-party failure report, or a file already on disk in this repository. Electron on this repo is 43.2.0 (`pnpm-lock.yaml`, `apps/desktop` dependency block), and `@electron-toolkit/utils` is 4.0.0.

---

### 1. The dead keystroke has a named cause, and it kills two rows, not one

`apps/desktop/src/main/index.ts:254` calls `optimizer.watchWindowShortcuts(window, { zoom: true })`. The shipped implementation in `@electron-toolkit/utils@4.0.0` (read on disk, `dist/index.mjs`) registers a `before-input-event` listener that, when `!is.dev`, does:

```js
if (input.code === 'KeyR' && (input.control || input.meta)) event.preventDefault();
if (input.code === 'KeyI' && ((input.alt && input.meta) || (input.control && input.shift)))
  event.preventDefault();
```

Electron's own docs for `before-input-event` state that `preventDefault` "will prevent the page `keydown`/`keyup` events **and the menu shortcuts**", and point to `webContents.setIgnoreMenuShortcuts` as the surgical alternative if only menu shortcuts should be suppressed ([webContents API](https://www.electronjs.org/docs/latest/api/web-contents)). The package's own README wording is "Default open or close DevTools by `F12` in development and ignore `CommandOrControl + R` in production" ([npm](https://www.npmjs.com/package/@electron-toolkit/utils?activeTab=readme)).

Consequence the proposal does not yet name: `apps/desktop/src/main/menu/app-menu-template.ts:105` prints `{ role: 'toggleDevTools' }` beside `{ role: 'reload' }`, and the guard blocks `Alt+Cmd+I` / `Ctrl+Shift+I` in production too. The requirement "the menu never advertises a dead keystroke" therefore covers two rows in the packaged build, not one.

Second-order detail worth keeping: the `{ zoom: true }` option is what stops the same guard from swallowing `CmdOrCtrl+Minus` and `CmdOrCtrl+Shift+Equal` (the `if (!zoom)` branch). The Gateway menu's Zoom In / Zoom Out accelerators at `apps/desktop/src/main/menu/app-menu-template.ts:136-143` survive today only because that flag is set. If the guard is removed wholesale, that flag goes with it and Chromium's own page-zoom keys become live again alongside the canvas zoom command, so `CmdOrCtrl+-` could do two things at once. Verify on a packaged build before choosing.

**Recommendation.** Keep the guard only where it earns its keep: call `optimizer.watchWindowShortcuts` under `is.dev` (its dev branch just wires F12 devtools and blocks nothing), and let the packaged build's menu accelerators through, since the app deliberately publishes Reload and Toggle DevTools as View items. If the page-zoom double-handling shows up, replace the removed guard with an owned `before-input-event` listener that blocks only `Minus` / `Shift+Equal` and nothing else. Do not solve this by deleting the printed accelerators, because `role: 'reload'` and `role: 'toggleDevTools'` supply the accelerator themselves and a role's other options are ignored on macOS.

### 2. `role: 'help'` is the off-the-shelf answer, with one prior-art failure to check

Electron's Application Menu tutorial says the `help` role "defines a top-level Help submenu that has a search bar for other menu items" and that it "requires items to be added to its `submenu` to function" ([Application Menu](https://www.electronjs.org/docs/latest/tutorial/application-menu)). That satisfies the spec's macOS search-field requirement without any custom code, and matches Apple's guidance that each app carries a Help menu and that macOS supplies the search field ([HIG, The menu bar](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar)).

Failure report to plan around: [electron/electron#4479](https://github.com/electron/electron/issues/4479) (opened 15 Feb 2016, closed) reports the Help search field migrating into a menu inserted before Help when the app calls `menu.insert(...)` and re-applies with `setApplicationMenu`. This repo rebuilds a whole template rather than inserting (`apps/desktop/src/main/menu/app-menu-conductor.ts`, `repaint`), and route-scoped Gateway and Usage menus are inserted before Help in the array on every route change, so the bug's shape is adjacent but not identical. Treat "the search field still sits in Help after walking gateways to usage and back" as a manual macOS check in the acceptance pass, since no automated harness can see it.

### 3. Rebuild the menu, or mutate items? Electron answers half of it

`Menu.getApplicationMenu()` returns a menu that "doesn't support dynamic addition or removal of menu items", while instance properties (`checked`, `enabled`, `visible`) can be changed dynamically, and `menu.getMenuItemById(id)` exists for that ([Menu API](https://www.electronjs.org/docs/latest/api/menu), [MenuItem API](https://www.electronjs.org/docs/latest/api/menu-item)). So the conductor's full-rebuild is mandatory for the route-scoped menus and optional for ticks.

**Recommendation.** Keep the single rebuild path already documented in the `@summary` on `conductAppMenu` (`apps/desktop/src/main/menu/app-menu-conductor.ts`). A mixed model would put the tick's truth in two places, and the new sidebar and inspector reports plus the gateway lifecycle enablement multiply the repaint triggers, which is exactly where a split model rots. The cost is one extra `setApplicationMenu` per report; the benefit is that `AppMenuView` stays the only state.

### 4. Dimmed, not missing, is both the HIG rule and the safer Electron behavior

Apple: "Disable unavailable menu items... Keep menus enabled even when menu items are unavailable. It's important for people to be able to browse the contents of all menus to learn where commands reside" ([HIG, Menus](https://developer.apple.com/design/human-interface-guidelines/menus)). That underwrites the spec's "unavailable rather than missing" for the inspector item off-canvas and for the gateway lifecycle rows.

Electron nuance that makes it more than style: a _hidden_ menu item can still fire its accelerator on macOS unless `acceleratorWorksWhenHidden: false` is set, whereas a _disabled_ item does not fire ([Keyboard Shortcuts](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts), and the historical report [electron/electron#7737](https://github.com/electron/electron/issues/7737)). Choosing `enabled: false` gets HIG conformance and no ghost keystroke in one move. Note that `AppMenuItem` in `apps/desktop/src/main/menu/app-menu-template.ts:4-12` carries no `enabled` field yet, so the type grows.

### 5. Accelerator vocabulary and the number-key conflict

- Write `Alt`, never `Option`. Electron: "Use `Alt` instead of `Option`. The ⌥ Opt key only exists on macOS, whereas the `Alt` will map to the appropriate modifier on all platforms" ([Keyboard Shortcuts](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts)). The Usage ranges should read `Alt+CmdOrCtrl+1`, not `Option+CmdOrCtrl+1`.
- Option-modified digits are a known soft spot on macOS, because ⌥ plus a digit emits typographic characters and layout handling varies. A 2025 report describes `Cmd+Option+I` simply not firing ([electron/electron#45925](https://github.com/electron/electron/issues/45925), March 2025), and the docs record the non-QWERTY `globalShortcut` bug for the same family. Plan a manual press-test for at least one `Alt+CmdOrCtrl+<digit>` range, and hold `CmdOrCtrl+Shift+<digit>` as the fallback if the Option variant proves flaky on the target macOS build.
- Never reach for `registerAccelerator: false`, which prints a shortcut on Windows and Linux without registering it. That is precisely the "dead keystroke" the spec forbids.
- Menu accelerators are local, firing "only when the application is focused" ([Keyboard Shortcuts](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts)). On macOS the app stays focused with no window open, so the View navigation items work with the tray alive; the handler must then open a window on the route the way the settings shortcut already does (recorded in `openspec/changes/archive/2026-07-30-settings-screen/design.md`, `createMainWindow('/settings')` plus unconditional hash history). Reuse that seam rather than writing a second one.

**The number-key conflict is real and the proposal should own it.** Two conventions collide:

| Convention                | ⌘0                 | ⌘1..9          | ⌥⌘0              |
| ------------------------- | ------------------ | -------------- | ---------------- |
| Browsers and canvas tools | actual size / 100% | tab or view N  | (free)           |
| Xcode (Apple's own)       | toggle navigator   | navigator tabs | toggle inspector |

Browser and design-tool side: Chrome documents ⌘ and +/- for zoom and ⌘0 as reset ([Chrome zoom help](https://support.google.com/chrome/answer/96810)); Apple's own Preview lists "Zoom all images to actual size, Option-Command-0" and "Zoom all images to fit, Option-Command-9", i.e. the unmodified pair means actual size and fit for the current image ([Preview shortcuts](https://support.apple.com/guide/preview/keyboard-shortcuts-cpprvw0003/mac)); Figma puts Zoom to fit on Shift+1 ([Figma zoom and view options](https://help.figma.com/hc/en-us/articles/360041065034-Adjust-your-zoom-and-view-options)). Xcode side: ⌘0 toggles the navigator, ⌘1..9 select navigator tabs, ⌥⌘0 toggles the inspector.

The proposal's choice (plain digits walk the app, ⌘0 lands on 100%, ⇧⌘0 fits) is coherent and sits with the browser reading, which is the right one for an app whose main surface is a zoomable canvas. Two consequences follow. First, the sidebar and inspector toggles must not take ⌘0 or ⌥⌘0, since both are spoken for. Second, the closest documented prior art for the pair is VS Code: ⌘B toggles the Primary Side Bar and ⌥⌘B toggles the Secondary Side Bar ([VS Code user interface](https://code.visualstudio.com/docs/editing/userinterface), [Custom Layout](https://code.visualstudio.com/docs/configure/custom-layout)). Recommend ⌘B for the sidebar and ⌥⌘B for the inspector; neither collides with `Alt+CmdOrCtrl+<digit>` ranges or with `CmdOrCtrl+Shift+L` on Show Logs.

One more trap: do not implement "return to 100%" with `role: 'resetZoom'`. That role resets the _web contents_ zoom, not the canvas transform, so the Gateway item must stay a custom `click` carrying a new `canvas:command` value alongside the existing enum at `packages/contracts/src/ipc.ts:211-213`.

### 6. Dock menu: one API, no auto-refresh

`app.dock?.setMenu(menu)` is macOS-only and the docs' own sample carries two constraints as comments: "dock.setMenu only works after the 'ready' event is fired" and "Dock is undefined on platforms outside of macOS", hence the optional chaining ([macOS Dock tutorial](https://www.electronjs.org/docs/latest/tutorial/macos-dock), [Dock API](https://www.electronjs.org/docs/latest/api/dock)). Electron handles the click events itself, and the custom items sit above the system's window-management entries.

Nothing in the docs refreshes a Dock menu for you, so "the Dock menu MUST follow gateway state without asking a person to reopen it" means calling `setMenu` again on every engine-state change, mirroring what `apps/desktop/src/main/tray/tray-repaint.ts` already does for the tray. The gateway submenu shape to reuse is `gatewaySubmenu` in `apps/desktop/src/main/tray/tray-menu-template.ts:46-76`, which already encodes the enablement rule the spec wants (`serving = states[slug]?.status === 'running'`, Start disabled while serving, Stop and Restart enabled only while serving). Extract that shape rather than restating the rule, since it is one business rule and DRY applies to knowledge. Drop the `icon` field for the Dock variant unless a device check shows Dock submenu images render well.

### 7. Repository seams the new items must reuse, not re-invent

- Config folder reveal: main already owns the seam (`openFolder: async (path) => shell.openPath(path)` at `apps/desktop/src/main/index.ts:217`, folder derived in `apps/desktop/src/main/ipc/system-ipc.ts`). The _label_ the spec demands parity with lives in the renderer at `apps/desktop/src/renderer/src/pages/settings/lib/row-state.ts` (`revealLabelFor('finder') === 'Reveal in Finder'`). Main cannot import renderer code under the FSD boundary, so move that derivation into a shared package (`packages/contracts`) and have both surfaces read it. Duplicating the string in the menu template would put one rule in two files.
- Issue report and help URLs: the repository is `https://github.com/recomposesh/recompose` (`apps/web/src/lib/links.ts:1`), and the site is `recompose.sh` (allowed by `decideExternalOpen`, per `apps/desktop/src/main/windows/navigation-policy.test.ts`). New-issue target is `https://github.com/recomposesh/recompose/issues/new`. Open with `shell.openExternal`, the same call already used at `apps/desktop/src/main/windows/main-window.ts:78` and `apps/desktop/src/main/subscriptions/subscriptions-wiring.ts:165`.
- The checklist move is a pure template edit: `checklistToggleItem` is already shared between `macApplicationMenu` and `viewMenu` in `apps/desktop/src/main/menu/app-menu-template.ts:38-110`, so the change is deleting one call site and dropping the platform branch in `viewMenu`.

### 8. Acceptance-criteria hunt: what the existing harness can and cannot prove

`apps/desktop/e2e/app-menu.ts` already carries `chooseMenuItem(app, label)` and `menuItemChecked(app, label)`, both walking `Menu.getApplicationMenu()` through `electronApp.evaluate`, with the honest `@summary` that "Playwright drives no native menu". Two readers are missing for this change and should land with it:

- an enabled reader, for "the inspector item shows as unavailable rather than missing" and for the gateway lifecycle enablement;
- an accelerator reader, since `MenuItem` exposes `accelerator` as an instance property ([MenuItem API](https://www.electronjs.org/docs/latest/api/menu-item)) and several requirements are about which keystroke is _printed_.

What no harness proves: "the printed reload keystroke reloads **in a packaged build**". Clicking the item through `chooseMenuItem` bypasses the `before-input-event` guard entirely, so a green e2e run would say nothing about the bug. Pin that requirement instead with a node-side spec over the guard wiring (assert that nothing preventDefaults `KeyR` in production) plus a manual packaged-build press. Say so in the design rather than letting a passing click stand in for it.

### 9. Off-the-shelf check (project rule) came back empty, deliberately

Everything this change needs exists in Electron itself: roles `help`, `windowMenu`, `editMenu`, `reload`, `toggleDevTools`, `togglefullscreen`, menu accelerators for local shortcuts, and `app.dock.setMenu`. No third-party menu or shortcut library is warranted. Specifically reject `globalShortcut` for any of these, both because it takes the chord away from every other app (already the recorded decision in `openspec/changes/archive/2026-07-30-settings-screen/design.md`) and because the docs record its long-standing non-QWERTY macOS bug. Reject `electron-localshortcut` style helpers for the same reason: menu accelerators already cover a menu-backed command, and the spec's own rule is that every printed accelerator belongs to a menu item.

---

### Gaps, stated rather than papered over

- **The usage range vocabulary is unresolved.** The contract exposes exactly three ranges today (`packages/contracts/src/usage.ts:10`, `usageRangeSchema = ['24h','7d','30d']`), `usage:command` carries `range-24h|range-7d|range-30d` (`packages/contracts/src/ipc.ts:216-218`), and a spec pins that `range-90d` throws (`packages/contracts/src/ipc-usage.test.ts:77`). The usage spec asks the menu to name "every ledger range, the custom window included", which implies the renderer's address schema carries more than the contract enum. I spent my read budget before opening the renderer usage search schema, so confirm the address's real range vocabulary (and where the custom window lives) before sizing the Usage menu and its `Alt+CmdOrCtrl+<digit>` run.
- **Apple's HIG pages render client-side**, so `developer.apple.com/design/human-interface-guidelines/keyboards` and `.../menus` could not be fetched directly; the HIG quotes above come through search extraction of those same pages rather than a direct read. The menu-order and dimming claims are consistent across both the current and archived HIG, but treat exact wording as second-hand.
- **No publication dates.** Electron, Apple HIG, and VS Code doc pages carry no visible dates; all were read on 16 Aug 2026 against Electron's "latest" docs, which track a version at or ahead of the 43.2.0 pinned here.

Sources:

- [Electron: Application Menu](https://www.electronjs.org/docs/latest/tutorial/application-menu)
- [Electron: Menu API](https://www.electronjs.org/docs/latest/api/menu)
- [Electron: MenuItem API](https://www.electronjs.org/docs/latest/api/menu-item)
- [Electron: webContents API (before-input-event)](https://www.electronjs.org/docs/latest/api/web-contents)
- [Electron: Keyboard Shortcuts](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts)
- [Electron: macOS Dock tutorial](https://www.electronjs.org/docs/latest/tutorial/macos-dock)
- [Electron: Dock API](https://www.electronjs.org/docs/latest/api/dock)
- [electron/electron#4479 (Help role search bar moves on insert)](https://github.com/electron/electron/issues/4479)
- [electron/electron#7737 (accelerator and hidden items on macOS)](https://github.com/electron/electron/issues/7737)
- [electron/electron#45925 (Cmd+Option+I not firing, March 2025)](https://github.com/electron/electron/issues/45925)
- [@electron-toolkit/utils on npm](https://www.npmjs.com/package/@electron-toolkit/utils?activeTab=readme)
- [Apple HIG: The menu bar](https://developer.apple.com/design/human-interface-guidelines/the-menu-bar)
- [Apple HIG: Menus](https://developer.apple.com/design/human-interface-guidelines/menus)
- [Apple Support: Keyboard shortcuts in Preview on Mac](https://support.apple.com/guide/preview/keyboard-shortcuts-cpprvw0003/mac)
- [Google Chrome Help: Change text, image and video sizes (zoom)](https://support.google.com/chrome/answer/96810)
- [Figma: Adjust your zoom and view options](https://help.figma.com/hc/en-us/articles/360041065034-Adjust-your-zoom-and-view-options)
- [VS Code: User interface (Primary Side Bar, ⌘B)](https://code.visualstudio.com/docs/editing/userinterface)
- [VS Code: Custom Layout (Secondary Side Bar, ⌥⌘B)](https://code.visualstudio.com/docs/configure/custom-layout)
