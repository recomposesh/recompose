# Code map: `app-menu-shortcuts` (tier full)

## 1. Rider ledger (requested deliverable)

**Result: empty ledger, not a lookup failure.**

`gh issue list --repo recomposesh/recompose --label rider --state open --limit 200 --json number,title,body` returned `[]` on two consecutive runs. The command succeeded rather than errored: `gh label list --repo recomposesh/recompose` confirms the label exists (`rider — Out-of-scope discovery parked from a fix cycle; read by the discovery phase`), and `--state all` returns 32 rider issues, every one `CLOSED` (#191, #190, #155, #154, #153, #140, #138, #137, #136, #130, #126, #123, #122, #121, #120, #119, #118, #117, #113, #111, #110, #109, #108, #106, #104, #103, #100, #99, #93, #92, #90).

**No open rider touches this feature. There are no prior out-of-scope riders to carry into `app-menu-shortcuts`.**

Two closed riders sit adjacent to this feature's surface and are named only as context, not as ledger entries: #123 (`subscriptions:activate stands without a surface since the menu prune`) and #108 (`Home is a blank dotted surface when the remembered gateway has gone`, which bears on the proposal's "gateways pick lands where the app's own home landing would").

## 2. Subsystems and files

### 2.1 Main-process application menu (Electron main; outside FSD)

- `apps/desktop/src/main/menu/app-menu-template.ts` — `AppMenuItem`, `AppMenuHandlers`, `AppMenuView`, `buildAppMenuTemplate`. This is the single file the Help menu, the View navigation group, the surface toggles, the split zoom group and the moved checklist item all land in. It currently ends at `{ role: 'windowMenu' }` with no Help menu and no `help` role; `checklistToggleItem` sits inside `macApplicationMenu` on darwin and inside `viewMenu` elsewhere; `gatewayMenu` binds `Zoom to Fit` to `CmdOrCtrl+0`; `usageMenu` binds ranges to `CmdOrCtrl+1/2/3`.
- `apps/desktop/src/main/menu/app-menu-conductor.ts` — `AppMenuConduct`, `conductAppMenu`. Holds the `AppMenuView` value and repaints. New report channels (sidebar tick, inspector tick, gateway lifecycle state) extend `AppMenuConduct` beside `reflectLogsDrawer` / `reflectUsageTable` / `standOnUrl`.
- `apps/desktop/src/main/menu/app-menu-boot.ts` — `bootAppMenu`, which is where new push commands join `onCanvasCommand` / `onUsageCommand`.
- `apps/desktop/src/main/menu/app-menu.ts` — `installAppMenu`.
- `apps/desktop/src/main/menu/app-menu-template.testkit.ts` — `itemLabelled`, `menuLabelled`, `shapeOf`, `recordingHandlers`, `idleHandlers`, `atHome`, `atGatewayDetail`, `atUsage`, `everyPlatform`. Every new view field and handler must be added here or the existing specs stop compiling.
- Specs: `apps/desktop/src/main/menu/app-menu-template.test.ts`, `app-menu-conductor.test.ts`, `app-menu-conductor-usage.test.ts`, `app-menu-gateway.test.ts`, `app-menu-usage.test.ts`.

### 2.2 Contracts and the IPC wire

- `packages/contracts/src/ipc.ts` — `ipcChannels`, `ipcEvents`, `IpcChannel`, `IpcEvent`, `IpcEventPayload`, `RecomposeIpcEvents`, `systemStateSchema`, `SystemState`. `canvas:command` is `z.enum(['zoom-in','zoom-out','zoom-to-fit','tidy','toggle-logs'])`; `usage:command` is `z.enum(['range-24h','range-7d','range-30d','metric-requests','metric-tokens','metric-spend','metric-latency','toggle-table-twin','refresh'])`. Report channels `system:logs-drawer` and `system:usage-table` are the shape the new sidebar/inspector ticks copy.
- `apps/desktop/src/main/ipc/push-events.ts` — `pushCanvasCommand`, `pushUsageCommand` (plus `pushEngineStates`, `pushSettingsChanged`, `pushDevtoolsToggle`).
- `apps/desktop/src/main/ipc/system-ipc.ts`, `apps/desktop/src/main/ipc/register-ipc.ts` (line 115 wires `noteLogsDrawer: appMenu.reflectLogsDrawer`), `apps/desktop/src/main/ipc/dispatch.ts`, `apps/desktop/src/main/ipc/ipc-handlers.testkit.ts`.
- `apps/desktop/src/preload/index.ts` — bridge entries per channel.

### 2.3 Tray, and the Dock menu that reuses it

- `apps/desktop/src/main/tray/tray-menu-template.ts` — `TrayMenuHandlers` (carries `onStartGateway`, `onStopGateway`, `onRestartGateway`), `TrayGateway`, `TrayMenuItem`, `TrayMenuInput`, `TrayLifecycleIcons`, `buildTrayMenuTemplate`. The private `gatewaySubmenu` is the exact start/stop/restart shape the Dock menu mirrors, keyed on `input.states[gateway.slug]?.status === 'running'`.
- `apps/desktop/src/main/tray/menu-bar-tray.ts` — `showMenuBarTray`, `refreshMenuBarTray`, `hideMenuBarTray`, `isMenuBarTrayVisible`.
- `apps/desktop/src/main/tray/tray-wiring.ts` — `trayMenuWiring`.
- `apps/desktop/src/main/tray/tray-repaint.ts` — `trayRepainter` (the "follow gateway state without reopening" mechanism the Dock needs).
- `apps/desktop/src/main/tray/tray-icon.ts` — `trayIconFor`, `TrayIconSources`, `TrayIcon`.

### 2.4 Window and route awareness

- `apps/desktop/src/main/windows/renderer-url.ts` — `onGatewayDetailUrl`, `onUsageUrl`, `rendererUrlFor`, `rendererBaseFor`, `settingsShortcutRouteFor`, `newGatewayRouteFor`, `SETTINGS_SHORTCUT_ROUTE`. The View navigation items need sibling route builders here, and `settingsShortcutRouteFor` / `newGatewayRouteFor` are the working precedent for "reach the surface even with no window open".
- `apps/desktop/src/main/windows/main-window.ts`, `apps/desktop/src/main/index.ts` (`bootAppMenu` at line 83, `appMenu.standOnUrl(url)` at 256, `showMenuBarTray(trayMenuHandlers)` at 95).

### 2.5 Renderer, `app` layer (FSD)

- `apps/desktop/src/renderer/src/app/routes/__root.tsx` — mounts `SidebarToggle`, reads `sidebarHidden` through `useSyncExternalStore`.
- `apps/desktop/src/renderer/src/app/routes/-app-toolbar.tsx`, `-app-sidebar.tsx`.
- `apps/desktop/src/renderer/src/app/routes/-surface-request.ts` — `RootSearch`, `surfaceRequest`, `withSheet`, `withoutSheet`.
- Route files the navigation items target: `index.tsx` (uses `rememberedGateway`), `gateways.$slug.tsx`, `providers.tsx`, `usage.tsx`, `settings.tsx`.
- `apps/desktop/src/renderer/src/app/routes/-usage-range-act.tsx`, `-usage-filters-act.tsx`.

### 2.6 Renderer, `shared` layer (FSD)

- `apps/desktop/src/renderer/src/shared/lib/visibility/sidebar-visibility.ts` — `sidebarHidden`, `hideSidebar`, `showSidebar`, `subscribeToSidebarVisibility`.
- `apps/desktop/src/renderer/src/shared/lib/visibility/inspector-visibility.ts` — `inspectorOpen`, `openInspector`, `closeInspector`, `toggleInspector`, `subscribeToInspectorVisibility`.
- `apps/desktop/src/renderer/src/shared/lib/visibility/logs-drawer-visibility.ts` — `logsDrawerOpen`, `toggleLogsDrawer`, `closeLogsDrawer` (the pattern the new toggles copy).
- `apps/desktop/src/renderer/src/shared/lib/index.ts` — segment barrel.
- `apps/desktop/src/renderer/src/shared/ui/sidebar-toggle/sidebar-toggle.tsx` — `SidebarToggle`; `apps/desktop/src/renderer/src/shared/ui/inspector-toggle/inspector-toggle.tsx` — `InspectorToggle`; `apps/desktop/src/renderer/src/shared/ui/index.ts` barrel.
- `apps/desktop/src/renderer/src/shared/api/engine.ts` — `useStartGateway`, `useStopGateway`, `gatewayStateIn`, `engineStatesQueryOptions`.
- `apps/desktop/src/renderer/src/shared/api/gateways.ts` — `useRemoveGateway`, `useSaveGateway`, `gatewaysQueryOptions`.
- `apps/desktop/src/renderer/src/shared/api/system.ts` — `useOpenConfigFolder`, `systemQueryOptions`.
- `apps/desktop/src/renderer/src/shared/testing/fake-bridge.ts`, `fake-usage-pushes.ts` — every new channel needs an entry here.

### 2.7 Renderer, `pages/gateway-canvas` slice (FSD pages)

- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/use-canvas-commands.ts` — `CanvasCommands`. Its `actsOn` returns a `Record<CanvasCommand, () => void>` so the set is exhaustive at the type level; adding `zoom-to-100` (or a renamed fit command) to the contract fails the build here until this file answers it. This is the enforcement point for the zoom-group split.
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-canvas-page/canvas-page-hooks.ts` — the other `canvas:command` listener.
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-canvas-page/removal-flow-hooks.ts` — `useGatewayRemoval`.
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/removal-dialog/removal-dialog.tsx` — `RemovalDialog` (the confirmation the Gateway menu's delete must pass through).
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-general-info/gateway-general-info.tsx` — `GatewayGeneralInfo`.
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/endpoint-box/endpoint-box.tsx` — carries `<CopyButton label="Copy base URL" value={baseUrl} />` at line 107, the existing base-URL copy the menu item mirrors.
- `apps/desktop/src/renderer/src/pages/gateway-canvas/lib/canvas-viewport.ts` (`RESTING_VIEWPORT`, `viewportOf`), `canvas-viewport-store.ts` (`canvasViewport`, `keepCanvasViewport`), `tidy-layout.ts` (`tidyPositions`).
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/canvas-zoom-controls/`, `ui/gateway-canvas-page/canvas-standings-hooks.ts`, `ui/gateway-canvas-page/canvas-gestures.ts` (both call `toggleInspector`).

### 2.8 Renderer, `pages/usage` slice (FSD pages)

- `apps/desktop/src/renderer/src/pages/usage/ui/usage-page/usage-page-moves.ts` — `movedSearch`, with `RANGE_BY_COMMAND` mapping only `range-24h`/`range-7d`/`range-30d`. The proposal's "every ledger range" widens this map.
- `apps/desktop/src/renderer/src/pages/usage/ui/usage-page/usage-page.tsx` — the `usage:command` listener and `system:usage-table` reporter.
- `apps/desktop/src/renderer/src/pages/usage/lib/usage-search.ts` — `UsageSearchRange`, `PresetRange`, `ChartMeasure`, `withRange`, `spendSnappedRange`, `usageSearchFrom`. The full range set the address accepts is the module-private `USAGE_SEARCH_RANGES = ['1h','24h','7d','30d','this-week','this-month','custom']` (lines 1-9), and the chart measures are the module-private `CHART_MEASURES = ['requests','tokens','latency','spend']` (line 15).
- `apps/desktop/src/renderer/src/pages/usage/lib/usage-window.ts` — `presetWindows`, `PresetWindow`, `windowFor`, with the module-private `PRESET_ORDER` at line 55.
- `apps/desktop/src/renderer/src/pages/usage/ui/range-control/`, `ui/range-calendar/` (the calendar the custom-range pick must open).

### 2.9 Renderer, `widgets` layer (FSD)

- `apps/desktop/src/renderer/src/widgets/gateway/toolbar/lib/use-gateway-lifecycle.ts` — `GatewayLifecycle`, `useGatewayLifecycle`. The enable/disable law the Gateway menu's start/stop/restart items must match.
- `apps/desktop/src/renderer/src/widgets/gateway/toolbar/ui/toolbar-strip/toolbar-strip.tsx` — mounts both `SidebarToggle` and `InspectorToggle`, so it is the on-screen twin of the new View items.
- `apps/desktop/src/renderer/src/widgets/gateway/toolbar/ui/address-pill/address-pill.tsx`, `ui/gateway-toolbar/gateway-toolbar.tsx` (`GatewayToolbar`).
- `apps/desktop/src/renderer/src/widgets/get-started/ui/get-started-panel/` — the checklist surface the moved View item shows.
- `apps/desktop/src/renderer/src/widgets/gateway/sidebar/ui/gateway-sidebar/`, `apps/desktop/src/renderer/src/widgets/provider/sidebar/ui/provider-sidebar/`.

### 2.10 Renderer, `pages/settings` slice (config-folder reveal the Help menu copies)

- `apps/desktop/src/renderer/src/pages/settings/ui/data-section/data-section.tsx` — calls `useOpenConfigFolder()` and prints `revealLabelFor(system.fileBrowser)`.
- `apps/desktop/src/renderer/src/pages/settings/lib/row-state.ts` — `revealLabelFor`.
- `apps/desktop/src/main/system/file-browser.ts` — `fileBrowserFor`, `FileBrowser`; `packages/contracts/src/ipc.ts` `systemStateSchema.fileBrowser` is `z.enum(['finder','explorer','file-manager'])`. Main already holds everything the Help menu's config-folder item needs without a renderer round trip.

## 3. Gaps found (reported, not guessed)

1. **The "window input guard" the proposal blames for the dead reload keystroke does not resolve to any file.** `before-input-event`, `globalShortcut`, `setIgnoreMenuShortcuts` and `registerShortcut` return zero hits across `apps/desktop/src`. The only `webContents.on(` call sites in main are `apps/desktop/src/main/index.ts:255` (`did-navigate-in-page`) and `apps/desktop/src/main/windows/main-window.ts:69` (`will-navigate`), neither of which touches keyboard input. The three `app.isPackaged` reads are in `apps/desktop/src/main/index.ts:80`, `apps/desktop/src/main/tray/menu-bar-tray.ts:87` and `apps/desktop/src/main/subscriptions/subscriptions-wiring.ts:48`, none of them a keystroke guard. Either the guard lives somewhere my search missed, or the premise needs restating before that requirement can be implemented. I am not naming a symbol for it.
2. **No Dock menu code exists.** `app.dock` appears nowhere under `apps/desktop/src/main`. This is greenfield beside `apps/desktop/src/main/tray/`.
3. **No gateway rename affordance exists on the canvas.** `GatewayGeneralInfo` in `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-general-info/gateway-general-info.tsx` takes only `{ gateway }` and carries no rename handler. The only `onRenamed` in the slice belongs to `ModelGeneralInfo` (`ui/model-general-info/model-general-info.tsx:160`) and renames a virtual model, not a gateway. The spec's "the same rename affordance the canvas offers" has no existing gateway-level target.
4. **No `engine:restart` channel exists.** `ipcChannels` in `packages/contracts/src/ipc.ts` holds `engine:start`, `engine:stop` and `engine:states` only, and `apps/desktop/src/renderer/src/shared/api/engine.ts` exports `useStartGateway` and `useStopGateway` with no restart. Restart today exists only as `TrayMenuHandlers.onRestartGateway`, satisfied inside `apps/desktop/src/main/tray/tray-wiring.ts`. The Gateway menu's restart item and the Dock's restart both need a main-side path rather than the renderer mutation pair.
5. **The full ledger range list is not reachable from main.** `USAGE_SEARCH_RANGES` and `CHART_MEASURES` are module-private consts in `apps/desktop/src/renderer/src/pages/usage/lib/usage-search.ts`, and `PRESET_ORDER` is private in `usage-window.ts`. The menu that must "name every ledger range" is built in `apps/desktop/src/main/menu/app-menu-template.ts`, which cannot import a renderer FSD page slice. The range vocabulary needs a `packages/contracts` home, or the enum in `ipcEvents['usage:command']` becomes the single source both sides read.
6. **No Help menu scaffolding exists.** `buildAppMenuTemplate` carries no `{ role: 'help' }` and no `shell.openExternal` call site lives under `apps/desktop/src/main/menu/`. The published guide URL and the new-issue URL have no constant anywhere I found; both are new values the change must introduce.

## 4. FSD layer summary for renderer-side work

- `app` — `routes/__root.tsx`, `routes/-app-toolbar.tsx`, `routes/-surface-request.ts`, the five route files. Navigation targets and the root-level toggles land here.
- `widgets` — `gateway/toolbar` (lifecycle and the toggle twins), `get-started` (checklist).
- `pages` — `gateway-canvas` (canvas command ear, zoom, removal, base URL), `usage` (command moves, ranges), `settings` (config folder reveal).
- `entities` — untouched; nothing in this change is a domain model reused across pages.
- `shared` — `lib/visibility/*` (the reported surface state), `ui/sidebar-toggle`, `ui/inspector-toggle`, `api/engine`, `api/gateways`, `api/system`, `testing/fake-bridge`.

Per the skill's Pages First rule, the new command answers stay in the page slice that owns each surface (`pages/usage`, `pages/gateway-canvas`); only the reported sidebar and inspector state, which two pages already read, belongs in `shared/lib/visibility/`, where it already sits.

## 5. Budget note

Fifteen-read budget honoured: twelve `Read` calls spent, the rest of the map assembled from `grep`/`find`. Gap 1 (the missing input guard) is the one place where a deeper read of `apps/desktop/src/main/windows/window-options.ts` and `window-chrome.ts` might still turn something up; I searched both for `input` and `reload` and found nothing but a preload path at `main-window.ts:48`.
