## Why

The menu bar grew route by route and drifted from the platform contract. No Help menu stands anywhere, and on macOS the missing `help` role also costs the system's menu search field. The app menu carries a checklist toggle that belongs under View, because it shows a surface rather than configuring the app. The plain number accelerators sit on one route's time ranges while every comparable tool spends them on walking the app. The canvas claims the reset-zoom accelerator for fitting, which reads as a different operation everywhere else. The View menu prints a reload keystroke that a window input guard swallows in packaged builds. And no Dock menu exists, while the platform guidelines name the Dock as the fallback surface when the system hides the menu bar extra.

## What changes

- The menu bar gains a trailing Help menu on every platform: recompose Help, the config folder, and an issue report.
- The onboarding checklist item moves from the macOS app menu to View, joining the copy the other platforms already show there.
- The View menu gains one navigation item per top-level surface, gateways, providers, and usage, on the plain number accelerators.
- The View menu gains sidebar and inspector toggles with their own accelerators, each tick reading the renderer's reported state.
- The Usage menu's time ranges move to Option-modified number accelerators and the menu grows to list every ledger range the address accepts.
- The Gateway menu gains lifecycle items for the standing gateway: start, stop, and restart, plus copying the base URL and deleting behind the existing confirmation.
- The Gateway menu's zoom group splits resetting to 100% from fitting the composition, and Tidy gains an accelerator.
- The reload row stops advertising a keystroke that a packaged build swallows: the guard yields or the printed keystroke goes.
- macOS gains a Dock menu mirroring the tray's per-gateway start, stop, and restart submenus.

Deferred out of this change: a command palette, a Find surface, and an in-app shortcut overlay carrying the Help menu's shortcut reference. A gateway Rename item waits too, because its canvas affordance doesn't exist yet. Each needs a new surface of its own, and this change only wires menus and accelerators to functionality the app already has. The riders live at [recomposesh/recompose#245](https://github.com/recomposesh/recompose/issues/245) and [recomposesh/recompose#244](https://github.com/recomposesh/recompose/issues/244).

## Locked decisions

1. **No Rename item.** The canvas offers no gateway rename affordance, so the Gateway menu ships without one until rider #244 lands it. Delete Gateway keeps its label without an ellipsis, because the existing confirmation doesn't earn one.
2. **Three Help items.** recompose Help opens https://recompose.sh, because the connect sheet's guide links belong to each client rather than to the app. The config folder item reads its label from a reveal-label table that moves into the contracts package, so the menu and the settings row print one string. Report an Issue… opens the repository's new-issue page. On macOS the menu carries the system `help` role, stands last in one rebuilt template, and prints no accelerator on its top-level item.
3. **Main-side navigation.** Gateways, Providers, and Usage sit on the plain 1, 2, and 3 accelerators. The handlers run beside the settings seam and take no window argument, so a pick with no window open creates one. The gateways pick lands where the home landing lands.
4. **One toggle channel each way.** The sidebar toggles on B and the inspector on Alt plus B, both under the command modifier. A `view:command` push event carries the toggles out and a `system:surface-toggles` report channel carries the truth back. The inspector item renders as unavailable off the canvas, never hidden, and the menu item type grows an `enabled` field.
5. **The range vocabulary moves to contracts.** The `usage:command` event widens to every range the address accepts, read from one ordered list both sides share and pinned by a type-level spec. The six presets take the Option-modified digits in address order, and Custom Range… carries no accelerator while landing the explorer with its calendar open.
6. **Lifecycle stays main-side.** Start, Stop, and Restart run over the lifecycle requests the tray already holds, so no engine restart channel joins the wire, and a totality spec pins the channel table. Enablement mirrors the tray rule from engine state and the standing slug. Start sits on Return, Stop on the period, and Restart on Shift plus Return, all under the command modifier.
7. **The renderer keeps the URL rule.** Copy Base URL rides the widened `canvas:command`, because the renderer owns the one base-URL printing rule and can announce the copy. Delete Gateway rides the same event into the existing removal confirmation.
8. **The zoom split.** The `canvas:command` event gains `zoom-to-100`. The plain reset accelerator lands on 100% and the shifted variant fits the composition. The Architecture Decision Record (ADR) captures that the Adobe lineage disagrees with this split while Sketch, browsers, and Electron's own reset role agree. Tidy takes an Option-modified accelerator.
9. **No packaged input guard.** The window shortcut guard runs only in development, so a packaged build attaches no `before-input-event` listener and the printed reload and devtools keystrokes live again. A node-side spec pins the wiring, and the packaged keystroke stays a named manual check.
10. **The Dock mirrors the tray.** The per-gateway submenu shape extracts from the tray for both consumers, without icons at first. The Dock menu rebuilds and re-sets on every engine state change, and an accessory run skips it without erroring.
11. **The checklist moves.** The onboarding checklist item leaves the macOS app menu for View on every platform.
12. **One rebuild path.** Every conductor reflect method gains the equality short-circuit the URL stand already has, and the window-closed hook clears the route-scoped view so no menu pushes into the void.
13. **Route-scoped menus stay.** The menu bar keeps its conditional Gateway and Usage menus in the standing order, with Help trailing on every platform and route.
14. **The harness grows readers.** The end-to-end menu harness gains an enabled reader and an accelerator reader beside the existing pickers.

## Design-system gap analysis

Every surface this change touches renders through the operating system: the menu bar, the Dock, and the tray. No Tailwind component appears, no design token changes, and the recompose-design-system project in Claude Design has nothing to sync. No component lands under a `ui/` segment, so no story obligation follows. The renderer edits stay inside existing components that answer new commands.

## Capabilities

### New capabilities

- `app-menu`: the application menu bar's shape, the Help menu, View navigation and surface toggles, the Gateway menu's lifecycle and zoom groups, and the Dock menu.

### Modified capabilities

- `usage`: the route-scoped Usage menu moves its ranges to Option-modified accelerators and lists every ledger range.

## Impact

- `apps/desktop/src/main/menu/`: the template, the conductor's view state, and the boot wiring grow new items and report channels.
- `packages/contracts/src/ipc.ts`: widened `canvas:command` and `usage:command` enums, a `view:command` push event, and a `system:surface-toggles` report channel; the range vocabulary and the reveal-label table move into the package.
- `apps/desktop/src/main/tray/`: the Dock menu reuses the tray's gateway submenu shape.
- Renderer pages and widgets answer the new commands and report surface state; no engine change, no stored document change.
- `apps/desktop/e2e/app-menu.ts`: the menu harness grows an enabled reader and an accelerator reader.
