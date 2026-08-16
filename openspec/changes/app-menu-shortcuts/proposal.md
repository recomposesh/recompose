## Why

The menu bar grew route by route and drifted from the platform contract. No Help menu stands anywhere, and on macOS the missing `help` role also costs the system's menu search field. The app menu carries a checklist toggle that belongs under View, because it shows a surface rather than configuring the app. The plain number accelerators sit on one route's time ranges while every comparable tool spends them on walking the app. The canvas claims the reset-zoom accelerator for fitting, which reads as a different operation everywhere else. The View menu prints a reload keystroke that a window input guard swallows in packaged builds. And no Dock menu exists, while the platform guidelines name the Dock as the fallback surface when the system hides the menu bar extra.

## What changes

- The menu bar gains a trailing Help menu on every platform: recompose Help, a keyboard shortcut reference, the config folder, and an issue report.
- The onboarding checklist item moves from the macOS app menu to View, joining the copy the other platforms already show there.
- The View menu gains one navigation item per top-level surface, gateways, providers, and usage, on the plain number accelerators.
- The View menu gains sidebar and inspector toggles with their own accelerators, each tick reading the renderer's reported state.
- The Usage menu's time ranges move to Option-modified number accelerators and the menu grows to list every ledger range the address accepts.
- The Gateway menu gains lifecycle items for the standing gateway: start, stop, and restart, plus copying the base URL, renaming, and deleting behind the existing confirmation.
- The Gateway menu's zoom group splits resetting to 100% from fitting the composition, and Tidy gains an accelerator.
- The reload row stops advertising a keystroke that a packaged build swallows: the guard yields or the printed keystroke goes.
- macOS gains a Dock menu mirroring the tray's per-gateway start, stop, and restart submenus.

Deferred out of this change: a command palette, a Find surface, and an in-app shortcut overlay. Each needs a new surface of its own, and this change only wires menus and accelerators to functionality the app already has.

## Capabilities

### New capabilities

- `app-menu`: the application menu bar's shape, the Help menu, View navigation and surface toggles, the Gateway menu's lifecycle and zoom groups, and the Dock menu.

### Modified capabilities

- `usage`: the route-scoped Usage menu moves its ranges to Option-modified accelerators and lists every ledger range.

## Impact

- `apps/desktop/src/main/menu/`: the template, the conductor's view state, and the boot wiring grow new items and report channels.
- `packages/contracts/src/ipc.ts`: new push commands for navigation, surface toggles, and gateway lifecycle picks, plus report channels for the sidebar and inspector ticks.
- `apps/desktop/src/main/tray/`: the Dock menu reuses the tray's gateway submenu shape.
- Renderer pages and widgets answer the new commands and report surface state; no engine change, no stored document change.
