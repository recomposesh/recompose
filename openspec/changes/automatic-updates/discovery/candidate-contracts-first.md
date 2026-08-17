# Candidate: contracts-first (freeze the update contract, land every channel on it)

One structural claim drives everything below: **every sentence in the spec is a claim about state the renderer must be able to ask for, so the state contract is the design, and every platform is a producer bolted onto the same rail.** "The affordance outlives navigation" is a replayable-state requirement, not a UI requirement (acceptance brief 8.3). "The Store owns this install" is a state the renderer must read to render nothing. Multi-window consistency, the vscode#30178 failure, falls out of a broadcast push plus a `get` replay by construction. In this repository the contract is also where change is widest: a channel touches `packages/contracts/src/ipc.ts`, both preload maps in `apps/desktop/src/preload/index.ts`, the dispatcher list in `apps/desktop/src/main/ipc/dispatch.ts`, and a type-level spec, so moving it later is the expensive mistake. Freeze it once, then Windows, macOS and the AppImage are the same feature with three gates, and this slice ships all of it, including signed Windows updates through the one supported escape from the signing-order trap.

## 1. The contract

`packages/contracts/src/ipc.ts` gains a discriminated lifecycle, not a boolean:

```ts
export const updateChannelSchema = z.enum(['self', 'store', 'package-tool', 'none']);

export const updateStateSchema = z.discriminatedUnion('standing', [
  z.strictObject({ standing: z.literal('quiet'), channel: updateChannelSchema }),
  z.strictObject({ standing: z.literal('downloading'), version: nonBlankString }),
  z.strictObject({ standing: z.literal('ready'), version: nonBlankString }),
]);

export type UpdateState = z.infer<typeof updateStateSchema>;
```

- `'updates:get'` joins `ipcChannels` (request `z.void()`, response `ipcResult(updateStateSchema)`).
- `'updates:restart'` joins `ipcChannels` (request `z.void()`, response `ipcResult(z.void())`).
- `'updates:changed'` joins `ipcEvents` with `updateStateSchema` as payload.

What is deliberately absent: a failure arm. A failed check is log-only by requirement, so the bridge cannot carry it; a state the renderer must never render does not belong in the contract. `channel` rides only the `quiet` arm because it answers the one question the renderer has while nothing waits ("should any update surface exist here at all"), and `downloading` exists so the interval guard has a name, not so the renderer draws progress; the strip renders on `ready` alone. The union earns a `*.test-d.ts` beside the existing contract type specs, and the TDD invariant applies at the type level.

## 2. The pure core: a policy and a fold

Two pure modules in `apps/desktop/src/main/updates/`, shaped after `activationPolicyFor` and `loginItemAvailabilityFor` in `apps/desktop/src/main/index.ts`:

- `update-channel.ts`: `updateChannelFor(platform, env, windowsStore, isPackaged): UpdateChannel`. Rows: unpackaged is `'none'`; `darwin` is `'self'`; `win32` with `windowsStore === true` is `'store'`, otherwise `'self'`; `linux` with a non-empty `env.APPIMAGE` is `'self'`, otherwise `'package-tool'`. `windowsStore` stays `boolean | undefined` because Electron documents `undefined`, never `false`.
- `update-standing.ts`: `nextUpdateState(state: UpdateState, event: UpdaterEvent): UpdateState`, folding the electron-updater event names (`checking-for-update`, `update-available`, `update-not-available`, `download-progress`, `update-downloaded`, `update-cancelled`, `error`) into the contract's three arms. The fold encodes the guard: once `ready`, every event but the restart is identity, which is what stops a re-check from discarding the pending download (electron-builder#3003, #2006).

Both are table-spec'd deterministically, carry a property twin over input permutations, and are mutate-listed. The fold is where the mutation gate earns its keep: a mutant that lets `ready` regress to `downloading` is exactly the bug family vscode#160530 and #99020 document.

## 3. The edge adapter and the wiring

`wire-app-updater.ts` owns the only import of `electron-updater`: `error` listener attached before the first check (acceptance brief 9.1), a `logger` adapter over the `console.warn` idiom of `apps/desktop/src/main/index.ts`, every failure line carrying operation, reason and the feed constant derived from the `publish` block of `apps/desktop/electron-builder.yml`. It holds the current `UpdateState`, runs each updater event through `nextUpdateState`, answers `updates:get` from that held state, and hands each transition to `pushUpdatesChanged`, which joins `apps/desktop/src/main/ipc/push-events.ts` in the broadcast form beside `pushSettingsChanged`. A `createUpdatesIpcHandlers` group follows `createSystemIpcHandlers` in `apps/desktop/src/main/ipc/system-ipc.ts` and spreads into `assembleIpcHandlers`. Launch check after `createMainWindow(HOME_ROUTE)`, hourly interval, disposal in the `dispose` arm of `registerAppLifecycle`. `autoDownload` and `autoInstallOnAppQuit` stay `true`, the second as an explicit decision: a plain quit is the person's act. `quitAndInstall()` runs only from `updates:restart`, only in `ready`.

## 4. The renderer

`shared/api/updates.ts` copies `shared/api/settings.ts` exactly: `updatesQueryOptions` over `updates:get`, `bindUpdateStateToCache` writing each push into the cache, `useRestartForUpdate` over `updates:restart`. One `ensureQueryData` in the root loader, one binding in `usePushedCaches`, both in `app/routes/__root.tsx`. The strip is the Patreon shape from the Mobbin arm, mounted in `RootLayout` above `surfaceMain`, at `widgets/app-update/ui/update-ready-strip/update-ready-strip.tsx` with its stories sibling. It names the waiting version from the `ready` arm and the running version beside it (the n8n reference: naming both answers the question a person actually has), and shows one solid restart action.

## 5. Windows, signed inside the build

The signing-order trap is the finding that fails silently in production: `latest.yml` records a sha512 computed at build time, and signing the `.exe` afterwards invalidates it on every user's machine (electron-builder#2111, #6848). The supported escape is signing during the electron-builder run through `win.signtoolOptions.sign` pointing at our own script, which submits to SignPath over its documented Web API with wait-for-completion semantics, so hashing happens after signing and `latest.yml` is correct by construction. Two named risks ride this choice: no vendor documents electron-builder plus SignPath together, so the glue script is untested prior art (acceptance brief 14.4), and SignPath Foundation's manual approval per release may hold a CI job at a human's pace (research brief section 10, unconfirmed). The fallback, post-build signing plus manifest regeneration, stays rejected: community-only ground with a base64-versus-hex trap.

Beside the hook: `win.publisherName` is set to the Subject CN read out of an actually signed artifact, never to a marketing name, because electron-builder otherwise derives it from the certificate issuer and every update refuses (electron-builder#1773, #7983). A release step asserts the configured value and the signed artifact's CN are byte-identical, and a second step recomputes the sha512 of every uploaded artifact against its channel file before the draft is created. That gate also catches the manifest-overwrite mistake when a second architecture leg appears.

## 6. macOS and the rest of the pipeline

`mac.notarize` flips to `true` with the `APPLE_API_KEY` triple and a fail-loud check. The mac target moves to one explicit universal `dmg` plus `zip` entry, closing the Intel gap ADR-0133 names, behind a one-day spike: electron-builder advises building per architecture and merging, which conflicts with the single `macos-26` leg, and the spike decides between a universal single build and a merge step. A config spec asserts `zip` stays beside `dmg`, no artifact name carries a space, and `nsis.perMachine` stays absent. The feed itself already ships: v0.2.0 and the v0.3.0 draft both carry all three channel files and blockmaps despite `--publish never` (verified with `gh release view` on 2026-08-17), so the acceptance brief's item 1 is settled and the draft gate stands untouched. The Store `appx` submission stays release ops outside this slice; the gate in `updateChannelFor` is the code's whole obligation, and the brief's 10.2.9 question (a Store intake route that installs a plain `.exe` the flag cannot see) goes to the brainstorm as a scope decision.

## Build order

1. Contracts: the union, both channels, the event, the type specs.
2. Pure core: `updateChannelFor` and `nextUpdateState`, table specs, property twins, mutation listing.
3. Main: adapter, push helper, handler group, lifecycle hook.
4. Renderer: api module, strip with stories, root mount.
5. Pipeline: SignPath hook script and its two release-step assertions, notarization flip, universal spike then target change, config specs.
6. E2E: gating scenarios through the `inheritedEnv` seam in `apps/desktop/e2e/fixtures.ts`, the local-feed download path through `forceDevUpdateConfig`, the packaged N-to-N-plus-one proof in `test:e2e:packaged`, on a really signed Windows build once per certificate.

## Not building, and why

- **A failure arm in the contract**: the spec makes failure log-only; a state the renderer must never render is contract noise.
- **Progress UI**: `downloading` exists for the guard, not for a bar; the spec forbids the interruption a bar invites.
- **A settings "Updates" pane**: the Mobbin arm marks it a rider.
- **Staged rollout runbook**: first needed at the first staged release; the manifest edit touches no artifact hash, and `allowDowngrade` stays `false`.
- **electron-log**: the logger interface is three methods; the console idiom already in `apps/desktop/src/main/index.ts` satisfies it.

## Self-scores

- **Shipping speed: 4.** The SignPath application, the untested hook glue, and the universal spike all sit on the critical path of a single slice.
- **Correctness risk in production: 7.** The contract freeze plus the fold's mutation coverage close the state-divergence bug family, and the sha512 gate catches the one silent pipeline killer; the residual risk is the novel signing glue, which the gate itself fences.
- **Release-pipeline safety: 5.** Three consequential edits land together, two of them novel ground with no vendor recipe.
- **Spec fit of the person-facing behavior: 9.** Every channel the ADR names goes live at once, the affordance names both versions, and every window agrees.
- **Test cost: 6.** Two pure modules and a fold are cheap; the signed-Windows end-to-end pass and the universal spike are the expensive proofs no other candidate pays this slice.
