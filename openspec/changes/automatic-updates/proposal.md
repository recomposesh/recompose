# Automatic updates design

The gate-1 design document for the automatic-updates feature, amended from the entry proposal on 2026-08-17.

## Why

A person updates recompose today by downloading it again. Record 0035 shipped the release pipeline and deferred signing, notarization, and automatic updates to a phase it never scheduled. The blockers have since cleared. Architecture Decision Record (ADR) 0133 pinned the delivery: `electron-updater` reading the GitHub Releases feed, gated per install channel. Two brainstorm decisions then revised that record. ADR-0134 collapses Windows to one SignPath-signed installer through Store policy 10.2.9, built on the Nullsoft Scriptable Install System (NSIS). ADR-0135 trades the universal macOS build for an artifact per architecture, carried by one manifest.

The delta spec holds three requirements. An update arrives through the channel that installed the app, a download waits for the person, and a failed check stays out of the way. The field supplies the bar, because the trackers show what a naive updater does. An unlistened `error` event takes the main process down (electron-builder#8053). A re-check after a download restarts it and discards what it had (electron-builder#3003, #2006). Signing after the build ships a release nobody can update to, and nothing on screen says so (electron-builder#2111). An update badge shows a version that isn't there (VSCode#160530). Every decision below makes one of those failures impossible or immediately legible.

## What changes

The maintainer locked the decisions below at the brainstorm. The three candidate documents under `discovery/` fed them.

1. **Minimal scope carries failure-first discipline.** macOS and the Linux AppImage arm themselves in this slice. Windows stays exactly as today, because SignPath Foundation answers on its own calendar and unsigned self-update is the alternative ADR-0133 already rejected. The guards land before the features they fence, so no slice can ship the silent breakage it's exposed to.
2. **One pure function gates the channel.** `updateChannelFor(platform, env, isPackaged, inApplicationsFolder)` answers `'self'`, `'package-tool'`, or `'none'`, shaped after `activationPolicyFor` in `apps/desktop/src/main/index.ts`. Unpackaged is `'none'`, because electron-updater otherwise logs a confusing non-failure. Linux reads `env.APPIMAGE`: present is `'self'`, absent is `'package-tool'`. Windows is `'none'` this slice. No `windowsStore` input exists, per ADR-0134: no recompose build can set the flag. macOS running outside the Applications folder is `'none'` with a logged reason, because `Squirrel.Mac` can't replace a translocated or read-only copy and says nothing (electron-builder#8914, `Squirrel.Mac`#252). Only `'self'` arms the updater. The other answers run no check, render no control, and report no error.
3. **One module owns the updater.** Nothing else imports `electron-updater`. It attaches the `error` listener before the first check, unconditionally, because the spec's "a failed check leaves the app running" is a listener-ordering rule before it's an interface rule. Its logger adapter writes through the console idiom `apps/desktop/src/main/index.ts` already uses. Every failure line carries the operation, the updater's reason, and the feed address from a named constant, because the error object doesn't carry the feed. `checkForUpdates()` is never awaited on a path that blocks startup or an answer.
4. **Ready absorbs.** A pure fold drives the lifecycle: quiet, downloading, ready. Once a version finishes downloading, every event but the person's restart is identity, and checking stops until the next launch. That guard is what stops an interval check from re-downloading the pending version and discarding it (electron-builder#3003, #2006). The accepted residual: a newer version arriving while one waits reaches the person one restart later, never two.
5. **A plain quit installs what waits.** `autoInstallOnAppQuit` stays `true` as an explicit decision rather than an inherited default: quitting is the person's act. `quitAndInstall()` runs only from the restart channel, only in ready. The app holds no single-instance lock, so the lock trap (electron#5163) stays a future hazard, noted in the spec that pins the restart path.
6. **A launch check, then an hourly interval.** The interval is a named constant, and it clears in the `dispose` arm that `registerAppLifecycle` runs on `before-quit`.
7. **The bridge carries state, never events alone.** `updates:get` and `updates:restart` join `ipcChannels`, and `updates:changed` joins `ipcEvents`, carrying the whole update state. The push broadcasts to every window, and a renderer that mounts after the download asks and receives, which is what "outlives navigation" actually requires. Failure states never cross the bridge: a state the renderer must never render doesn't belong in the contract.
8. **The card stands in the sidebar, under the Get started panel.** The aurora header card, as drawn in `designs/recompose.pen`, in both schemes, with and without the panel above it. It renders only in ready, never on `update-available` alone, so it can't show a version that isn't staged.
9. **The feed is already live.** The published v0.2.0 release and the v0.3.0 draft both carry `latest.yml`, `latest-mac.yml`, `latest-linux.yml`, and the blockmaps, despite `--publish never` (verified with `gh release view` on 2026-08-17). That settles the acceptance brief's top conflict. The draft release stays the publishing gate untouched.
10. **The pipeline gains its guards in this slice.** A workflow step recomputes each artifact's sha512 against its channel file before the draft exists. The attestation step widens to cover `latest*.yml` and `*.blockmap`, because the manifest is the integrity anchor the updater trusts. `mac.notarize` flips on with a step that fails the run when the credential triple is absent. Config specs pin that `zip` stays beside `dmg`, that no artifact name carries a space, and that `nsis.perMachine` stays absent. **Every edit under `.github/workflows/release.yml` and `apps/desktop/electron-builder.yml` reaches the maintainer as an exact diff before it lands, per the standing instruction.**
11. **Windows self-update waits for SignPath.** When the foundation answers, one policy row flips to `'self'` and the signing hook lands in its own slice. Until then the interface offers no control that promises an update it never performs.
12. **macOS builds both architectures in one invocation.** Per ADR-0135, one run emits a `dmg` and `zip` per architecture and one `latest-mac.yml` naming both zips. The cross-architecture native-module spike runs before the workflow change, because `koffi` and `@node-wreq` ship native binaries.

## The picked approach

Three candidates competed in `discovery/`: minimal, contracts-first, and failure-first. The maintainer blended two.

**Minimal supplied the scope.** Its structural claim held: the only piece of the feature the project doesn't control is Windows signing, so nothing waits for it. Every one of the spec's scenarios passes without a Windows arm, and the deferral costs one pure-function row later.

**Failure-first supplied the discipline.** Its ledger of documented silent breakages became the ordering rule. The sha512 gate lands before any updater code. The listener-before-check spec, the ready-absorbing fold, the not-in-Applications gating, and the tested log contract all carry into the design.

**Contracts-first lost on its critical path.** It put the SignPath application, an untested signing hook, and the architecture spike inside one slice, so the whole feature would wait on the slowest external answer. Its contract shape survives anyway: the state union, the two channels, the event, and the type-level specs ride this design at minimal's scope.

## The card

The visual settled through four Mobbin passes and the maintainer's own iteration, recorded in `discovery/mobbin-references.md`. The final shape: a header zone washed flat in the scheme's own blue, two small sparkles, and a hairline-bordered white tile carrying a blue up arrow. Under those sit a centered "Update ready" over the versions line, and one full-width "Restart to update" button. Light and dark are both drawn, each with the Get started panel above and alone at the sidebar's bottom edge.

Naming both versions answers the question a person actually has (the n8n reference). One forward action gets the solid treatment, and deferring needs no button, because ignoring the card already defers. No dismiss control exists: the card states a condition and clears when the condition clears.

## Design-system gap analysis

- **Colors already exist.** `--blue-700: #0064d2` and `--blue-400: #3d9bff` sit in `apps/desktop/src/renderer/src/app/styles/primitives.css` lines 5 and 6. The header wash and the sparkles are alpha steps of those, and the hairlines are the borders the app already draws. No new token.
- **Radii sit on the existing scale.** The card takes 11, the sidebar-card class. The tile and the button take 6, the control class.
- **The icon sprite grows one glyph.** `shared/ui/icon/icon.tsx` carries `spark` already, which is the card's sparkle. It holds no upward arrow, so the sprite gains an `arrow-up` glyph in the same hand-drawn 24-grid style.
- **The card is a new widget.** It composes shared api and ui pieces and mounts in the root layout, so it lands as `widgets/app-update/ui/update-ready-card/update-ready-card.tsx` with its stories sibling, per the component-folder rule. The Feature-Sliced Design placement runs through the `feature-sliced-design` decision tree before the file exists.
- **The data binding copies a settled pattern.** `shared/api/updates.ts` mirrors `shared/api/settings.ts`: query options over `updates:get`, a cache binding over `updates:changed`, a mutation over `updates:restart`. The root loader gains one `ensureQueryData` and `usePushedCaches` gains one binding.
- **The design system project syncs at implementation.** The card's final drawing enters the Claude Design project "recompose-design-system" when the component lands, so the code and the system never diverge.
- **Both schemes get looked at through `claude-in-chrome` before the branch leaves the machine**, per the standing renderer rule.

## Capabilities

### New capabilities

- `updates`: the channel that owns an install, the download that waits for the person, and the failed check that stays out of the way.

### Modified capabilities

None. Settings, the menu, and every other capability stand untouched.

## Impact

**Contracts** (`packages/contracts/src/`). `ipc.ts` gains `updateStateSchema` as a discriminated union of quiet, downloading, and ready, the two request channels, and the `updates:changed` event. The barrel already re-exports the module. The union earns a type-level spec beside the existing contract specs.

**Main** (`apps/desktop/src/main/`). A new `updates/` folder holds the pure channel policy, the pure lifecycle fold, the log module, and the one adapter that touches `electron-updater`. `ipc/push-events.ts` gains the broadcast helper. `ipc/register-ipc.ts` and `ipc/dispatch.ts` register the handler group, following `createSystemIpcHandlers`. `index.ts` wires the launch check after `createMainWindow(HOME_ROUTE)`, and disposal rides `registerAppLifecycle`.

**Preload** (`apps/desktop/src/preload/`). Both maps in `index.ts` gain their entries, and `index.d.ts` follows.

**Renderer** (`apps/desktop/src/renderer/src/`). `shared/api/updates.ts`, the sprite glyph, the widget with its stories, and the root-layout mount in `app/routes/__root.tsx`.

**Packaging and release** (`apps/desktop/electron-builder.yml`, `apps/desktop/package.json`, `.github/workflows/release.yml`). `electron-updater` lands as a runtime dependency pinned to 6.x. The pipeline edits from decision 10 land one by one, each shown to the maintainer first.

**Tests.** The channel policy and the fold take deterministic table specs with property twins, mutate-listed. The adapter takes integration specs against a local feed through `forceDevUpdateConfig` and a `dev-app-update.yml`, which the packaged files already exclude. The gating scenarios ride the `inheritedEnv` seam in `apps/desktop/e2e/fixtures.ts`, and the restart proof rides the existing `test:e2e:packaged` project.

**Migration story.** None. No stored document changes shape, and the updater state lives in memory.

**Decision records.** ADR-0134 and ADR-0135 landed with this document's brainstorm. The implementation adds none unless a decision changes.

## Open questions for gate 2

1. **The integration feed fixture's shape.** A local HTTP server serving a crafted `latest*.yml`, reached through `forceDevUpdateConfig`, covers the failed-check and download paths without packaging. The freeze decides which scenarios ride it and which ride the env seam.
2. **The interval on a sleeping machine.** One check per elapsed interval must not stack into one per missed tick. The freeze fixes the mechanism, likely a plain `setInterval` whose coalescing electron-updater already provides for checks.
3. **Where the log lands for a packaged app.** The console idiom satisfies development. The freeze decides whether the spec's "the log carries the reason" binds to stdout or to a file a maintainer can ask a person for.
4. **The copy freeze.** The card's three strings pass through the `ux-writing` review before the scenario set freezes them.
