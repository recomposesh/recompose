# Candidate: failure-first (the failure ledger is the design)

One structural claim drives everything below: **this feature's outputs are mostly silences, and a silence is only trustworthy when every way it can break has a name, a log line and a test that forces it.** The spec forbids dialogs on failure, forbids restarts the person did not choose, and forbids controls that promise updates that never come, so the person-facing surface cannot reveal whether updating works. Only the discipline behind the silence can. The unit of design is therefore a ranked failure ledger: each documented failure mode maps to a state, a log shape, a guard and a test layer, and the UI is a one-state projection (ready, or nothing). Where the minimal candidate asks "what is the least that satisfies the scenarios," this one asks "what does the app do in each of the ten documented ways this goes wrong," and builds exactly that.

## 1. The ledger, ranked by blast radius

1. **Manifest hash drift.** Signing an artifact after electron-builder hashes it ships a release nobody can update to, with no error anywhere until user machines report `sha512 checksum mismatch` (electron-builder#2111, #6848). Design answer: a release-workflow gate recomputes the sha512 of every uploaded artifact against its channel file before the draft exists, and the Windows updater arms only in a slice where signing happens inside the build. The gate ships before any Windows updater code, so the trap is fenced before it can exist.
2. **An unlistened `error` event kills main.** `AppUpdater` is an `EventEmitter`; an emitted `error` with no listener is a crash (electron#2276, electron-builder#8053). Design answer: the adapter attaches `error` before any check, in the same module, unconditionally; a spec emits `error` with no check in flight and asserts the process survives. The spec's "a failed check MUST leave the app running" is this listener, not a UI rule.
3. **The interval discards what it already downloaded.** A re-check after `update-downloaded` restarts the download and clears the pending directory (electron-builder#3003, #2006), and on macOS every re-download is the whole application. Design answer: the lifecycle fold makes `ready` absorbing; checking stops at `ready` and resumes on the next launch. The accepted residual: a newer version arriving while one waits is met one restart later, never two (the vscode#268531 shape).
4. **macOS refuses to update and says nothing.** A copy running translocated or outside `/Applications` cannot replace itself (electron-builder#8914, Squirrel.Mac#252). Design answer: this is channel gating, not an error. `updateChannelFor` gains a darwin input from `app.isInApplicationsFolder()`; false maps to `'none'`, the launch log names the reason, no check runs, and the affordance never promises what the volume forbids. The spec's own "no control that promises an update it never performs" covers the case exactly.
5. **A silently unnotarized macOS build installs once and never updates again.** Squirrel.Mac refuses unsigned updates. Design answer: `mac.notarize: true`, and the release job fails loudly when none of the documented credential triples is present, so the broken build never reaches the draft.
6. **AppImage file operations are fragile.** AppImageLauncher mounts break the unlink (`ENOSYS`, electron-builder#4046), a space in a filename broke the move (#8698), and the in-place rename breaks a person's launcher shortcut (#5810). Design answer: every one lands in the log as a named reason through the `error` listener and leaves the app running; a config spec pins that no artifact name across targets carries a space; the shortcut break is recorded as an accepted consequence in the ADR draft because the spec's AppImage scenario asks only for the download.
7. **The feed fails for reasons that are not ours.** GitHub answered HTML instead of JSON for a day in January 2023 (community discussion #45590); `ERR_UPDATER_CHANNEL_FILE_NOT_FOUND` arrives when a release carries no channel file (electron-builder#5562). Design answer: one log shape for every check failure, carrying the operation, the updater's reason, and the feed address from a named constant (the error object does not carry it), so an external outage reads as what it is. A draft release is invisible to the provider by design and stays the publishing gate.
8. **"It quit and never came back."** The long family: electron#5289, #8418, electron-builder#3402, #5127. Design answer: `quitAndInstall()` runs only in `ready`, only from the person's restart; the packaged e2e proves the restart lands on the new version, because "restarted and nothing changed" is a failure, not a no-op (acceptance brief 13.2). `apps/desktop/src/main/app-lifecycle.ts` runs `dispose` on `before-quit`, and `quitAndInstall` closes windows first and emits `before-quit` after, so disposal still runs and nothing in it prevents the quit. The app holds no `requestSingleInstanceLock` (verified by search over `apps/desktop/src`), so the lock trap (electron#5163) is a future hazard only; the spec that pins the restart path notes it.
9. **The affordance lies.** VS Code's badge showed updates that were not there (vscode#160530, #99020) and appeared in one window only (#30178). Design answer: the affordance renders from pushed state, the push broadcasts to every window, and a late-mounting renderer replays through a `get` channel; it appears if and only if a download finished and is staged.
10. **The check schedule stacks.** A sleeping machine or an overlapping slow check must not queue downloads. Design answer: electron-updater already coalesces concurrent checks; the interval is a named hourly constant cleared in `dispose`, and the fold makes a stacked tick harmless because `ready` absorbs it.

## 2. What the ledger leaves standing

The runtime shape that satisfies the ledger is small, and it is deliberately the same skeleton the other candidates carry: a pure `updateChannelFor(platform, env, windowsStore, isPackaged, inApplicationsFolder)` policy, a pure lifecycle fold with `ready` absorbing, one adapter module owning the only `electron-updater` import, `updates:get` and `updates:restart` channels plus an `updates:changed` broadcast in `packages/contracts/src/ipc.ts`, and the Patreon-shaped strip from the Mobbin arm mounted in the root layout. Failure states exist inside main and in the log; the bridge carries only quiet, downloading and ready, because a state the renderer must never render does not cross a process boundary.

Platform scope follows the ledger's own ordering: macOS and the AppImage arm now, and Windows arms only after ledger row 1's gate exists and SignPath signs inside the build, which this candidate sequences as gate first, glue second, row flip last, inside one slice if SignPath answers quickly and across two otherwise. The feed itself is already live: v0.2.0 and the v0.3.0 draft both carry all three channel files and blockmaps despite `--publish never` (verified with `gh release view` on 2026-08-17).

## 3. The logging contract

One module, `apps/desktop/src/main/updates/update-log.ts`, so the log shape is a tested seam rather than scattered `console.warn` calls: every line carries the operation (`check`, `download`, `install`), the reason as the updater gave it, and the feed address constant. It satisfies the `logger` interface electron-updater wants (`{ info, warn, error }`) and writes through the same console idiom `apps/desktop/src/main/index.ts` already uses, so a maintainer reads one stream. The spec scenario "the log carries the reason and the feed it tried" gets its assertion against this module, not against electron-updater's message text.

## 4. The test matrix, five layers

- **Unit**: a deterministic table spec per ledger row that is pure logic: every `updateChannelFor` row including the `undefined` Store flag and the not-in-Applications darwin row; every fold transition including `ready` absorbing `update-available`.
- **Property**: `updateChannelFor` over permutations of platform, env, flag and packaging, with the deterministic twin carrying mutation duty, per the repository's property-and-twin rule.
- **Integration**: the adapter against real `electron-updater` pointed at a local feed through `forceDevUpdateConfig` and a `dev-app-update.yml` (already excluded from packaging by `apps/desktop/electron-builder.yml` line 10): a feed answering 404, a feed answering HTML, a feed offering a higher version, and an emitted `error` with no listener-ordering mistake, each asserting the log line and the surviving process.
- **E2E**: the three gating scenarios through the `inheritedEnv` seam in `apps/desktop/e2e/fixtures.ts`; the strip appearing while the person works, surviving navigation, and never appearing on `update-available` alone.
- **Packaged**: the existing `test:e2e:packaged` project proves N to N-plus-one lands and reopens on the new version, and that a draft release produces no update; once per certificate on a really signed Windows build.

Mutation scope lists `update-channel.ts`, the fold, and `update-log.ts`.

## 5. Pipeline, ordered by what fails silently

1. The sha512 gate (ledger row 1), also attesting `latest*.yml` and `*.blockmap` alongside the binaries, because the manifest is the integrity anchor the updater trusts and today's `attest-build-provenance` step in `.github/workflows/release.yml` covers only the binaries.
2. `mac.notarize: true` with the fail-loud secrets check (row 5).
3. The config specs: `zip` beside `dmg`, no spaces in artifact names, `nsis.perMachine` absent.
4. Then, and only then, the SignPath hook and `win.publisherName` asserted byte-identical against the signed artifact's Subject CN, with the universal-mac spike beside it.

## Build order

1. The ledger as specs: the table specs and twins for policy and fold, red first.
2. Contracts and the log module.
3. The adapter and wiring, driven by the integration feed fixtures.
4. Renderer strip and bindings.
5. Pipeline steps 1 to 3, then the Windows sequence as its own tail.
6. The packaged proofs.

## Not building, and why

- **Any failure UI**: the spec makes failure log-only; the ledger's job is making the log sufficient.
- **Progress UI, settings pane, installed-version copy**: riders or design-time one-liners; nothing in the ledger needs them.
- **A pending-update persistence layer**: `autoInstallOnAppQuit` stays `true` as the explicit decision, so a plain quit installs what waits; the fold re-arms on next launch, which is cheaper than persisting UI state and survives every crash the vscode family documents.
- **Staged rollout runbook**: first needed at the first staged release; the manifest edit touches no hash, `allowDowngrade` stays `false`, and a bad release only ever gives way to a higher version.
- **electron-log**: three methods, satisfied by the tested log module over the existing console idiom.

## Self-scores

- **Shipping speed: 5.** The ledger front-loads specs and fixtures the other candidates defer, and the Windows tail waits on the same external answer as everyone else.
- **Correctness risk in production: 9.** Every documented silent failure has a named guard and a forcing test before the code that could commit it exists.
- **Release-pipeline safety: 9.** The gates land before the features they fence, and the one attestation gap in today's workflow closes.
- **Spec fit of the person-facing behavior: 8.** All nine scenarios pass with the strongest silence discipline, and the not-in-Applications case stops lying by construction; Windows still arrives on SignPath's calendar.
- **Test cost: 4.** The honest price. Feed fixtures, packaged proofs, and per-row table specs are the candidate; cutting them cuts the design.
