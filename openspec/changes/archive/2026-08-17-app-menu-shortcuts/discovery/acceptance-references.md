## Acceptance-references brief: `app-menu-shortcuts` (tier full)

Scope covered: the eight requirements in `openspec/changes/app-menu-shortcuts/specs/app-menu/spec.md`, checked against Electron's API docs, Electron's issue tracker, Apple's HIG, and the repository's current wiring. Every criterion below is either a repository fact or a cited third-party claim. Where the evidence is thin I say so in the clause.

---

### 1. The dead reload keystroke is fully diagnosed, and the mechanism matters

`apps/desktop/src/main/index.ts:254` runs `optimizer.watchWindowShortcuts(window, { zoom: true })` on every `browser-window-created`. The package documents that it "will open or close DevTools by F12 in development and **ignore CommandOrControl + R in production**" ([@electron-toolkit/utils README](https://github.com/alex8088/electron-toolkit/blob/master/README.md), [npm](https://www.npmjs.com/package/@electron-toolkit/utils)). The reason it also kills the _menu_ row is spelled out in Electron's own docs for `before-input-event`: "Calling `event.preventDefault` will prevent the page `keydown`/`keyup` events **and the menu shortcuts**. To only prevent the menu shortcuts, use `setIgnoreMenuShortcuts`" ([webContents API](https://www.electronjs.org/docs/latest/api/web-contents)). So the `{ role: 'reload' }` row in `apps/desktop/src/main/menu/app-menu-template.ts:103` prints ⌘R and the guard eats it in a packaged build.

Load-bearing constraint on the fix: you **cannot** print an accelerator on macOS while deliberately not registering it. `registerAccelerator` ("If false, the accelerator won't be registered with the system, but it will still be displayed. Defaults to true") is documented **Linux and Windows only** ([MenuItem API](https://www.electronjs.org/docs/latest/api/menu-item)). There is no macOS inverse either, so the only two honest exits are (a) stop guarding ⌘R, or (b) replace `{ role: 'reload' }` with a plain `{ label: 'Reload', click: … }` carrying no accelerator, since a role's accelerator is implicit and can't be blanked.

**Acceptance criteria**

- AC-R1: in a packaged build, pressing the keystroke the View menu prints on the reload row reloads the surface; if no keystroke is printed, the row still reloads on click.
- AC-R2: the same check runs on Windows and Linux, because the guard is not macOS-specific.
- AC-R3: no other row the menu prints is swallowed by the same guard. Audit at minimum ⌘R, F5, F12 and whatever the undocumented `zoom` option claims.

**Gap:** I could not read the `shortcutOptions` type. The README says only "you can use `shortcutOptions` to control more shortcuts" and names no options ([README](https://github.com/alex8088/electron-toolkit/blob/master/README.md)); a grep for `watchWindowShortcuts` under `node_modules/.pnpm` returned nothing, so what `{ zoom: true }` actually binds and whether an option can spare ⌘R is unverified. The implementer should read the installed `.d.ts` before choosing exit (a) or (b).

---

### 2. `role: 'help'` on macOS has two documented traps, and one is triggered by this app's own design

Electron's docs describe `help` as "a top-level Help submenu that has a search bar for other menu items, and **it requires items to be added to its submenu to function**" ([MenuItem API](https://www.electronjs.org/docs/latest/api/menu-item)). An empty Help submenu means no search field.

The second trap is directly relevant here. In [electron/electron#4479](https://github.com/electron/electron/issues/4479), inserting a menu ahead of a `role: 'help'` menu and re-setting the application menu made the macOS search bar attach to the _newly inserted_ menu. `buildAppMenuTemplate` in `apps/desktop/src/main/menu/app-menu-template.ts:235-243` does exactly this shape of thing: it splices `gatewayMenu` and `usageMenu` in and out per route, then the whole menu is re-set through `Menu.setApplicationMenu` in `apps/desktop/src/main/menu/app-menu.ts`. Adding Help after `windowMenu` puts a conditionally-inserted menu ahead of the Help role on every route change.

Third: [electron/electron#23683](https://github.com/electron/electron/issues/23683) reports that a custom accelerator on the `help` role does nothing on macOS. Don't print one.

**Acceptance criteria**

- AC-H1: after walking gateways → usage → providers (which inserts and removes the route-scoped menus), the macOS Help menu still owns the search field, and no other menu shows one.
- AC-H2: the Help submenu is never empty on macOS.
- AC-H3: the Help menu's top-level item carries no accelerator.
- AC-H4: typing an item name into the macOS Help search field finds items from the other menus.

---

### 3. The Help menu's item count and labels sit against Apple guidance

Apple's HIG says the item after the Spotlight-for-Help search field should be "the name of your application and the word Help" (so "recompose Help" is right), and it advises "it's good to have only **one** custom item in the Help menu" ([archived Apple HIG: Menus](https://leopard-adc.pepas.com/documentation/UserExperience/Conceptual/AppleHIGuidelines/XHIGMenus/XHIGMenus.html)). The proposal ships four. I'd call this soft evidence rather than a blocker: the page is the archived Leopard-era HIG, and shipping Mac apps routinely carry several Help items. Flagging it so the decision is made rather than drifted into.

The config-folder item also has a knowledge-duplication problem. The reveal labels live in the **renderer** at `apps/desktop/src/renderer/src/pages/settings/lib/row-state.ts` (`finder → 'Reveal in Finder'`, `explorer → 'Show in Explorer'`, `file-manager → 'Open folder'`), and the actual reveal runs through `openFolder: async (path) => shell.openPath(path)` at `apps/desktop/src/main/index.ts:217`. A main-process menu cannot import from the renderer, so "the same file-manager label" means either moving the label table somewhere both sides read or duplicating a business rule.

**Acceptance criteria**

- AC-H5: the Help menu's config-folder item shows byte-identical text to the settings surface's reveal action on each of the three platform labels, from one shared table rather than two.
- AC-H6: the item performs the same act (`shell.openPath` on the folder), not `shell.showItemInFolder`, so both surfaces land in the same place.
- AC-H7: the app-help item's label is "recompose Help", per HIG.

---

### 4. Dock menu: three documented constraints plus one this repo introduces

Electron's docs: `app.dock` is a readonly property that "only exists on macOS", `dock.setMenu` "only works after the 'ready' event is fired", and the sample guards with `app.dock?.setMenu(dockMenu)` inside `app.whenReady()` ([Configuring the macOS Dock](https://www.electronjs.org/docs/latest/tutorial/macos-dock)). Mutating an already-set `Menu` is unreliable on macOS ([electron/electron#846](https://github.com/electron/electron/issues/846), [#12633](https://github.com/electron/electron/issues/12633), [#608](https://github.com/electron/electron/issues/608)); the working pattern is rebuild-and-re-set.

The repo-specific one: `apps/desktop/src/main/windows/stays-back.ts` returns `'accessory'` for a darwin run with `RECOMPOSE_WINDOW_STAYS_BACK` set, and `apps/desktop/src/main/index.ts:182-185` applies it via `app.setActivationPolicy`. An accessory app has **no Dock tile**, so it has no Dock menu. The spec requirement "The Dock reaches every gateway" has no stated exception for that run, which is a hole in the spec as written.

The shape to reuse is already there: `apps/desktop/src/main/tray/tray-menu-template.ts` builds per-gateway Start/Stop/Restart with `enabled` computed from `states[slug]?.status === 'running'` and falls back to a disabled `'No gateways yet'` row.

**Acceptance criteria**

- AC-D1: `setMenu` is called only after `whenReady`, and the call is optional-chained so a Windows or Linux run neither throws nor no-ops silently.
- AC-D2: starting a gateway from the tray and then opening the Dock menu without relaunching shows the updated enablement, i.e. a fresh `Menu.buildFromTemplate` is re-set on every engine-state change rather than the existing menu being mutated.
- AC-D3: with zero stored gateways the Dock menu shows the same disabled placeholder row the tray shows, not an empty menu.
- AC-D4 (spec gap): in a stays-back run the app is an accessory with no Dock tile; the requirement must either exclude that run explicitly or the code must skip the Dock wiring without erroring.

---

### 5. ⌘1/⌘2/⌘3 for top-level navigation is well-supported prior art

Apple's own apps: Finder ⌘1/⌘2 switch view modes, Calendar ⌘1–⌘4 switch Day/Week/Month/Year ([Mac keyboard shortcuts](https://support.apple.com/en-us/102650)). Xcode ⌘1–⌘9 switch navigators ([Xcode menu command shortcuts](https://developer.apple.com/library/archive/documentation/IDEs/Conceptual/xcode_help-command_shortcuts/MenuCommands/MenuCommands014.html)). Things 3 uses number keys to jump between top-level lists ([Things support](https://culturedcode.com/things/support/articles/2785159/)). Slack uses ⌘1–⌘9 for workspaces ([Slack shortcuts](https://slack.com/help/articles/201374536-Slack-keyboard-shortcuts)). The common thread is "⌘+digit walks the app's primary top-level targets in displayed order", which is what the proposal wants. This part of the design is on firm ground; taking the digits back from Usage is the conforming move.

One correctness note on the no-window scenario. Menu accelerators are **local** shortcuts, triggered "only when the application is focused" ([Keyboard Shortcuts tutorial](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts)); on macOS the menu bar still stands with zero windows, so the _pick_ is reachable while the _accelerator press_ may not be if the app is unfocused. The spec's scenario is already phrased as a pick, which is correct. The failure mode reported around [electron/electron#7737](https://github.com/electron/electron/issues/7737) is the handler shape: a click handler written as `click(item, browserWindow)` with an `if (browserWindow)` guard silently does nothing when every window is closed.

**Acceptance criteria**

- AC-N1: no navigation handler reads the `browserWindow` click argument; each resolves or creates the main window itself.
- AC-N2: with the tray alive and no window open, picking each of the three navigation items opens a window standing on that surface.
- AC-N3: with a window open but unfocused, the accelerator is not expected to fire; the criterion is the pick, not the keypress.
- AC-N4: the gateways pick lands on the last-looked-at gateway, and on the empty state when none stands.

---

### 6. The zoom split is a genuine industry disagreement, and the recommendation should say so

The convention is split three ways:

- **Adobe lineage** (Photoshop, Illustrator, Pixelmator Pro, Sketchbook): ⌘0 = fit, ⌘1 = 100% ([Pixelmator Pro shortcuts](https://support.apple.com/en-sg/guide/pixelmator-pro/pix71a3304c4/macos)).
- **Sketch, Canva**: ⌘0 = actual size, fit elsewhere ([Sketch Mac shortcuts](https://www.sketch.com/docs/shortcuts/mac/), [Canva shortcuts](https://www.canva.com/help/canva-keyboard-shortcuts/)).
- **Figma**: sidesteps ⌘+digit entirely, ⇧0 = 100%, ⇧1 = fit, explicitly because ⌘/Ctrl+digit is spent on tabs ([Figma forum thread on the clash](https://forum.figma.com/archive-21/improved-zoom-shortcut-keys-10143)).

The proposal's premise ("everywhere else the plain reset accelerator means actual size") is true of browsers and of Electron's own `resetZoom` role, and true of Sketch, but **false** of the Adobe lineage. I'd still recommend the proposal's split: ⌘0 = 100%, ⇧⌘0 = fit. It matches the framework the app is built on (`resetZoom` is a documented Electron role bound to ⌘0), it matches the browser muscle memory of the audience, and it keeps the pair adjacent in the menu. But the ADR should record that the Adobe lineage disagrees rather than claim consensus.

Two hazards on the shifted variant. First, [electron/electron#26907](https://github.com/electron/electron/issues/26907) reports macOS menus render accelerators against a **hard-coded US layout** since 4.0.0-beta.1, so `Cmd+Shift+7` prints as `Cmd+&` on a Spanish ISO keyboard. The issue is **closed** and it discusses only Shift+7, so whether ⇧⌘0 misprints today is an inference, not a finding. Second, `optimizer.watchWindowShortcuts(window, { zoom: true })` is already in the boot path and its `zoom` option is undocumented; if it binds ⌘0/⌘+/⌘- for page zoom, the Gateway menu's zoom group is double-bound.

**Acceptance criteria**

- AC-Z1: four distinct items exist (in, out, 100%, fit), each with its own action.
- AC-Z2: ⌘0 lands the canvas at exactly 100%, and ⇧⌘0 fits the whole composition.
- AC-Z3: pressing ⌘0 on the canvas does not also change the page's zoom level (the `{ zoom: true }` interaction).
- AC-Z4: on a non-US keyboard layout, the menu prints the accelerators it actually fires. Verify manually; treat #26907 as unconfirmed for digits.
- AC-Z5: Tidy carries an accelerator that no other menu on the same route claims.

---

### 7. Option-modified digits for the Usage ranges: safe _only_ with Cmd alongside

Bare ⌥+digit on macOS composes a character (⌥1 → ¡ on a US layout), so an `Alt+1` accelerator never matches; Electron's docs also say to declare `Alt` rather than `Option` because ⌥ is macOS-only while `Alt` maps correctly everywhere ([Accelerator docs](https://www.electronjs.org/docs/latest/api/accelerator)). Adding Cmd defuses it, and ⌥⌘+digit is exactly Xcode's inspector-tab idiom ([Xcode shortcuts](https://useyourloaf.com/blog/xcode-keyboard-shortcuts/)), so it reads as native. On Windows, bare `Alt+digit` collides with menu mnemonic access, so `CmdOrCtrl+Alt+N` is right there too.

The spec also says the menu "grows to list every ledger range the address accepts". Digits run out at nine.

**Acceptance criteria**

- AC-U1: every range accelerator is `CmdOrCtrl+Alt+<digit>`, never `Alt+<digit>` and never `Option+…`.
- AC-U2: each printed range accelerator actually switches the range on macOS with a US layout, and the tenth-and-beyond range carries no accelerator rather than doubling one.
- AC-U3: the Usage menu lists exactly the ranges the address accepts; a range the address accepts but the menu omits is a failure, and vice versa.
- AC-U4: ⌘1/⌘2/⌘3 no longer change the usage range anywhere.

---

### 8. Ticks, disabled items, and the rebuild-per-state-change pattern

HIG Rule 1.3 in `.agents/skills/macos-design-guidelines/SKILL.md` (line 88 onward) states menu items "must reflect current state. Disable items that are not applicable… Toggle checkmarks for on/off states", which backs the spec's "unavailable rather than missing". Electron's `enabled` is documented as "If false, the menu item will be greyed out and unclickable" while `visible` "will be entirely hidden" ([MenuItem API](https://www.electronjs.org/docs/latest/api/menu-item)) — and on macOS a hidden item's accelerator stops firing ([electron/electron#7737](https://github.com/electron/electron/issues/7737)), so `visible: false` would silently kill the keystroke too. Use `enabled: false`.

On the rebuild pattern the current code already uses (whole template rebuilt from `AppMenuView`, then `Menu.setApplicationMenu`): that is the pattern the community converged on, because "rebuilding it based on events in the renderer process is the only way to keep the menu in sync" ([electron/electron#12636](https://github.com/electron/electron/issues/12636)). That issue reported the menu misbehaving when rebuilt _while the user has it open_ on macOS; it is **closed**, fixed via PR #12809, so treat it as a regression check rather than a live defect.

**Acceptance criteria**

- AC-S1: the inspector item off-canvas renders greyed and clickable-but-inert, never absent, and its accelerator does nothing rather than reaching a stale handler.
- AC-S2: hiding the sidebar from its on-screen toggle flips the View menu's tick without a menu reopen, which requires the renderer report to arrive and a rebuild to run.
- AC-S3: opening the View menu and holding it open while a gateway's state changes does not corrupt hover or selection (regression check against #12636).
- AC-S4: the Dock menu and the app menu never mutate an already-set `Menu` instance; each state change builds a fresh template.
- AC-S5 (HIG ellipsis): "Rename…" takes the ellipsis because it needs input; **"Delete" should not**, because the archived HIG carve-out is that a simple confirmation doesn't earn one ([HIG menu anatomy](https://developers.apple.com/design/human-interface-guidelines/macos/menus/menu-anatomy/), [HN thread quoting the carve-out](https://news.ycombinator.com/item?id=20249297)). "Settings…" and "New Gateway…" already in `apps/desktop/src/main/menu/app-menu-template.ts` are correct.

---

### 9. Menu-bar shape

`.agents/skills/macos-design-guidelines/SKILL.md` Rule 1.1: "Every app must include at minimum: App, File, Edit, View, Window, Help… Add app-specific menus between Edit and View or between View and Window." The proposal's order (route-scoped menus between View and Window, Help last) conforms. Rule 1.5 pins the App menu's contents, which `macApplicationMenu` currently satisfies apart from the checklist toggle the proposal is moving out — that move brings the file into conformance rather than away from it.

**AC-M1**: on all three platforms and on all three routes, the trailing menu is Help; on macOS the leading menu is the app menu with About/Settings/Services/Hide/Quit intact and no checklist row.

---

### 10. Testability, which constrains how the criteria can be written

`apps/desktop/e2e/app-menu.ts` records the binding constraint in its own docstring: "Playwright drives no native menu, so a scenario that presses a shortcut reaches the item the same way the keyboard would and runs the action hanging off it." `chooseMenuItem` finds the item by label and invokes `click()`; `menuItemChecked` reads `.checked` and returns `null` for an absent item so a step can wait. Consequently **no e2e test in this repo can prove an accelerator fires**. Accelerator strings and enablement have to be pinned by unit specs over `buildAppMenuTemplate` (`apps/desktop/src/main/menu/app-menu-template.test.ts` and its siblings), and AC-R1 (the packaged-build reload) is only verifiable by hand on a packaged artifact. Say that in the design rather than writing an e2e scenario that silently proves something weaker than it claims.

---

### Recommendation

Adopt the proposal's accelerator map (⌘1/2/3 navigation, ⌘0 = 100%, ⇧⌘0 = fit, ⌥⌘+digit for ranges) — it is backed by Apple, Xcode, Things and Electron's own `resetZoom` role — with four changes before implementation:

1. Put Help **after** `windowMenu` and add a regression check for #4479's search-field drift, since this app splices menus in and out per route.
2. Resolve the reload row by reading the installed `shortcutOptions` type first; if no option spares ⌘R, drop `role: 'reload'` for a click-only row, because macOS offers no print-without-registering.
3. Move the reveal-label table out of `apps/desktop/src/renderer/src/pages/settings/lib/row-state.ts` into a place both the menu and the settings surface read, rather than duplicating the rule.
4. Amend the Dock requirement to state what happens in a stays-back (accessory) run, where no Dock tile exists.

### Stated gaps

- The `shortcutOptions` contract of `watchWindowShortcuts` is undocumented and I could not locate the installed source, so the reload fix is not yet decidable from evidence.
- Whether ⇧⌘0 misprints on non-US layouts is an inference from #26907 (which is closed and discusses only Shift+7), not a finding.
- I did not confirm the installed Electron version, so I cannot say for certain that #12636's fix (PR #12809) is present; treat AC-S3 as a check, not a known defect.
- I did not verify that the "published guide" the Help menu should open exists or has a shortcut-reference page; that URL is unconfirmed.
- The HIG "only one custom Help item" guidance comes from the archived Leopard-era HIG, so I weight it as a prompt for a deliberate decision, not a rule.
