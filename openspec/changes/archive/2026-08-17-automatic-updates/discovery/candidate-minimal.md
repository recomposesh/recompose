# Candidate: minimal (smallest shippable diff)

One structural claim drives everything below: **the only piece of this feature the project does not control is Windows signing, so nothing waits for it.** SignPath Foundation answers on its own calendar: an application, a published signing policy, defined author and reviewer roles, and a manual approval per release (`docs/adr/0133-an-update-arrives-through-the-channel-that-installed-it.md`, consequences). Unsigned NSIS self-update is the alternative that ADR already rejected. So this slice ships self-update on the two channels where every prerequisite is on hand today: macOS under the organization's Developer ID, and the Linux AppImage, which needs no certificate at all. Windows keeps exactly today's behavior: manual download, no check, no control. Every one of the spec's nine scenarios passes, because no scenario names a Windows self-update; the Windows scenario the spec does carry ("the Store owns a Windows install") is a gating scenario, and gates are cheap. When SignPath answers, slice 2 flips one row of a pure function and adds the pipeline pieces beside it.

## 1. The feed already exists, verified rather than assumed

The acceptance brief's highest-priority item was a conflict: electron-builder's troubleshooting page says channel files appear only when publishing, and all three build scripts in `apps/desktop/package.json` end in `--publish never`. Read against the actual releases, the conflict resolves in the pipeline's favor: v0.2.0 (published) and v0.3.0 (draft) both carry `latest.yml`, `latest-mac.yml`, `latest-linux.yml` and the `.blockmap` files beside their artifacts (verified with `gh release view` on 2026-08-17). Feed generation changes nothing in this slice, and the draft release stays the publishing gate untouched, exactly as `.github/workflows/release.yml` line 99 already creates it.

## 2. Channel gating: one pure function

`updateChannelFor` lands in `apps/desktop/src/main/updates/update-channel.ts`, shaped after `activationPolicyFor(process.platform, process.env)` and `loginItemAvailabilityFor(process.platform, app.isPackaged)` in `apps/desktop/src/main/index.ts`:

```ts
export type UpdateChannel = 'self' | 'store' | 'package-tool' | 'none';

export function updateChannelFor(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv,
  windowsStore: boolean | undefined,
  isPackaged: boolean,
): UpdateChannel;
```

The rows: not packaged is `'none'`, because electron-updater otherwise logs "Skip checkForUpdates because application is not packed" and answers null, a confusing non-failure (acceptance brief 7.3). `darwin` is `'self'`. `win32` with `windowsStore === true` is `'store'`; `win32` otherwise is `'none'` in this slice, and that row is the whole of what slice 2 rewrites. `linux` with a non-empty `env.APPIMAGE` is `'self'`; `linux` otherwise is `'package-tool'`. The `windowsStore` parameter stays typed `boolean | undefined` because Electron documents `undefined` rather than `false`, and a spec pins all three values. Only `'self'` arms the updater. The other three run no check, render no control and report no error, which is the first requirement verbatim.

## 3. The updater at the edge

One module, `apps/desktop/src/main/updates/wire-app-updater.ts`, owns every touch of `electron-updater` so nothing else imports it. Its discipline, in order:

- An `error` listener attaches before the first check, unconditionally, in the same module. An unlistened `error` event takes the main process down, so the spec's "a failed check leaves the app running" is a listener-ordering requirement before it is a UI one (acceptance brief 9.1).
- `logger` gets a small adapter over the `console.warn` idiom `apps/desktop/src/main/index.ts` already uses in `onStorageCorrupt`. No electron-log dependency; the required interface is `{ info, warn, error }`.
- Every failure line carries the operation, the reason, and the feed address. The error object does not carry the feed, so a named constant holds it, derived from the `publish` block in `apps/desktop/electron-builder.yml` (owner `recomposesh`, repo `recompose`).
- `checkForUpdates()` fires and is never awaited on a path that blocks startup or an IPC reply; reported cases exist of the promise never resolving (electron-builder#7447).
- One check at launch, hooked after `createMainWindow(HOME_ROUTE)` in `startRecompose`, then an interval at a named constant of one hour. The interval clears in the `dispose` that `registerAppLifecycle` runs on `before-quit` (`apps/desktop/src/main/app-lifecycle.ts`).
- Once `update-downloaded` fires for a version, checking stops. A re-check after a download restarts the download and clears the pending directory, discarding what it had (electron-builder#3003, #2006). The cost is that a newer version arriving while one waits is not seen until the restart, which is one restart behind, never two (guards the vscode#268531 shape).
- `autoDownload` stays at its default `true`; that is the background download the spec asks for. `autoInstallOnAppQuit` stays `true` as an explicit decision rather than an inherited default: a plain quit is the person's act, so installing on it matches "waits for the person". `quitAndInstall()` runs only from the restart channel below, only after `update-downloaded`. The app holds no `requestSingleInstanceLock` (verified by search over `apps/desktop/src`), so the lock-strands-the-install trap (electron#5163) does not apply today.

## 4. The bridge: two channels, one event

`packages/contracts/src/ipc.ts` gains the smallest state that satisfies "the affordance outlives navigation":

```ts
export const updateStateSchema = z.strictObject({
  waiting: z.strictObject({ version: nonBlankString }).nullable(),
});
```

- `'updates:get'` joins `ipcChannels` (request `z.void()`, response `ipcResult(updateStateSchema)`).
- `'updates:restart'` joins `ipcChannels` (request `z.void()`, response `ipcResult(z.void())`).
- `'updates:changed'` joins `ipcEvents` with `updateStateSchema` as payload.

`pushUpdatesChanged` joins `apps/desktop/src/main/ipc/push-events.ts` in the broadcast-to-all-windows form beside `pushSettingsChanged`, because the affordance must stand in every window. A handler group `createUpdatesIpcHandlers` follows the `createSystemIpcHandlers` shape in `apps/desktop/src/main/ipc/system-ipc.ts` and spreads into `assembleIpcHandlers`. Both preload maps in `apps/desktop/src/preload/index.ts` gain their entries.

The `get` channel is what makes the affordance state rather than an event: a renderer that mounts after `update-downloaded` fired asks and receives (acceptance brief 8.3, the place where an event-only design breaks).

## 5. The affordance

`apps/desktop/src/renderer/src/shared/api/updates.ts` copies the settled pattern in `shared/api/settings.ts`: `updatesQueryOptions` over `updates:get`, `bindUpdateStateToCache` writing each push into the query cache, and a `useRestartForUpdate` mutation over `updates:restart`. The root loader in `app/routes/__root.tsx` gains one `ensureQueryData`, and `usePushedCaches` gains one binding.

The visible piece is the Patreon shape the Mobbin arm settled on: a quiet standing strip, one sentence naming the waiting version, one solid button that restarts. It mounts in `RootLayout` in `__root.tsx`, above `surfaceMain`, because the root layout is the only mount that outlives navigation (code map). It lives at `widgets/app-update/ui/update-ready-strip/update-ready-strip.tsx` with its stories sibling, renders only while `waiting` is non-null, so it never appears on `update-available` alone (acceptance brief 13.1), and clears when the condition clears rather than when someone dismisses it. No dismiss control: ignoring the strip already defers.

## 6. Pipeline edits, the whole list

- `mac.notarize` flips to `true` in `apps/desktop/electron-builder.yml`, the `APPLE_API_KEY`/`APPLE_API_KEY_ID`/`APPLE_API_ISSUER` secrets bind in `.github/workflows/release.yml`, and a step fails the macOS leg loudly when they are absent. A silently unnotarized build installs once and never updates again (acceptance brief 5.2), which is the one silent-in-production failure this slice is exposed to.
- A config spec asserts the mac target list keeps `zip` beside `dmg` (today's default, one future edit away from breaking every dmg update), that no artifact name across targets contains a space (guards electron-builder#8698), and that `nsis.perMachine` stays absent (a per-machine install turns updates into password prompts, acceptance brief section 4).
- Nothing else. No SignPath, no `win.publisherName`, no sha512 workflow gate (nothing re-signs after the build in this slice, so the hash cannot drift), no universal build, no appx, no staging runbook.

## Build order

1. Contracts: `updateStateSchema`, the two channels, the event, type specs.
2. Pure policy: `updateChannelFor` with its deterministic table spec and a property twin over env permutations, mutate-listed.
3. Main: `wire-app-updater.ts`, the push helper, the handler group, the lifecycle hook and interval disposal.
4. Renderer: `shared/api/updates.ts`, the strip widget with stories, the root-layout mount.
5. Config specs and the two workflow edits.
6. E2E: the three gating scenarios through the env seam `apps/desktop/e2e/fixtures.ts` already carries (`inheritedEnv`); the download-and-restart path against a local feed through `forceDevUpdateConfig` and a `dev-app-update.yml`, which `electron-builder.yml` line 10 already excludes from packaging; the packaged proof in the existing `test:e2e:packaged` project.

## Not building, and why

- **Windows self-update**: blocked on an external approval with no date. One pure-function row plus the pipeline work, in its own slice, once SignPath answers. Until then a Windows person updates the way they do today, and no control promises otherwise.
- **Universal macOS**: an ADR-0133 decision, deferred with its own spike. Today exactly one macOS runner produces exactly one `latest-mac.yml`, so the manifest-overwrite hazard (electron-builder#5592) cannot fire until a second architecture leg exists; adding Intel coverage is precisely when the universal work must land.
- **`app.isInApplicationsFolder()` detection**: a translocated or read-only-volume install will fail its update and land in the log through the error listener, but this slice does not detect it up front. Named as an accepted gap for the brainstorm, because the acceptance brief (5.4) wants more.
- **A settings "Updates" pane and installed-beside-waiting copy**: the Mobbin arm marks the pane a rider; naming the installed version beside the waiting one is one line and can join at design time without structural cost.
- **Staged rollout runbook**: a manual edit to a published manifest, first needed at the first staged release. Release ops, not app code.
- **Progress or "checking" UI**: the spec forbids interruptions; everything except a finished download is log-only.

## Self-scores

- **Shipping speed: 9.** No external waits, the feed is already live, and the runtime surface is one pure function, one edge module, one strip.
- **Correctness risk in production: 6.** Notarization is the moving part that can ship broken silently; the fail-loud secrets step is the mitigation. No signing-order exposure exists because nothing re-signs after the build.
- **Release-pipeline safety: 8.** Three small edits, each pinned by a spec or a failing step, and the draft gate untouched.
- **Spec fit of the person-facing behavior: 7.** All nine scenarios pass, but a Windows person on the direct download gets no update and no explanation, honoring the letter while deferring the ADR's own goal for that channel.
- **Test cost: 8.** One table-spec'd policy, one adapter behind a fake-able seam, one strip with stories; the packaged-feed e2e is the one expensive suite and every candidate pays it.
