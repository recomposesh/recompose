# Automatic updates solution design

## Header and change linkage

- Change id: automatic-updates
- Schema: recompose
- Proposal: [proposal.md](proposal.md)
- Specs: [specs/updates/spec.md](specs/updates/spec.md)
- Discovery: [discovery/](discovery/)
- Tasks: [tasks.md](tasks.md)

## Context

recompose ships through GitHub Releases on three platforms, and the feed files `electron-updater` reads already ride every release. No updater code exists anywhere in the repository. This design adds the whole subsystem. A channel policy decides which install updates itself, an adapter owns the one `electron-updater` import, a typed state crosses the bridge, and the update card stands in the sidebar. Windows stays dormant until SignPath Foundation answers, per the gate-1 document. Every edit to `.github/workflows/release.yml` or `apps/desktop/electron-builder.yml` waits on an explicit ask: the maintainer sees the exact diff before it lands, and none of those edits belongs to the implementation tasks below.

## Discovery inputs consumed

- `discovery/technical-research.md` section 3: fixed the application programming interface (API) surface this design writes against, `electron-updater` 6.x with the boolean `autoInstallOnAppQuit`.
- `discovery/technical-research.md` section 5 and `discovery/acceptance-references.md` section 2: moved every signing-order concern out of the implementation tasks and into the reserved release tail.
- `discovery/acceptance-references.md` section 9: made the `error` listener a spec-driven ordering rule inside the adapter.
- `discovery/acceptance-references.md` section 10: shaped the ready-absorbing fold, so an interval check can't discard a pending download.
- `discovery/acceptance-references.md` sections 5 and 7: added the not-in-Applications row and the unpackaged row to the channel policy.
- `discovery/code-map.md`: named every wiring point in the file map below.
- `discovery/mobbin-references.md`: settled the card, drawn final in `designs/recompose.pen`.
- `discovery/rider-ledger.md`: consulted, no impact. No prior rider carries in.
- `discovery/candidate-contracts-first.md`: supplied the state union and the fold, adopted at minimal's scope.

## Goals and non-goals

**Goals:**

- A macOS or AppImage install checks at launch and hourly, downloads in the background, and shows the update card only when a version stands ready.
- The person's restart is the only restart, and a plain quit installs what waits.
- A failed check leaves the app running and lands in the log with the operation, the reason, and the feed address.
- A deb install and an unpackaged run never check and never show a control.

**Non-goals:**

- No Windows self-update in this change. One policy row flips in a later slice.
- No release-pipeline edit inside the implementation tasks. The sha512 gate, the attestation widening, the notarization flip, the config specs, and the per-architecture macOS build are each a separate maintainer ask.
- No progress interface, no settings pane, no dismiss control, no notification, no dialog.
- No persistence of updater state. Memory only, rebuilt each launch.

## Constraints and invariants

- TypeScript maximum strictness: `strict: true` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`. No `any`, no `as` casts to silence errors.
- Never write code comments. The only exception is a constraint the code genuinely can't express.
- Test code changes if and only if behavior changes. State-based verification; doubles only at real process boundaries.
- A property test never carries mutation duty alone; every property law on a mutate-listed file gets a deterministic twin.
- Every component under a `ui/` segment owns a folder and ships its `*.stories.tsx` sibling before the branch leaves the machine.
- The `feature-sliced-design` decision tree runs before creating or moving any renderer file.
- Anything that reaches the screen gets looked at through `claude-in-chrome`, in both schemes, before it lands.
- Never disable, override, loosen, or silence any gate.

## Design

One import of `electron-updater` exists, in the composition point. Everything testable is pure or sits behind an injected port.

The flow at launch: `index.ts` computes the channel with `updateChannelFor`. Anything but `'self'` wires nothing and logs one line naming the channel. On `'self'`, `wireAppUpdater` receives the real updater as a port, attaches the `error` listener first, sets the logger adapter, and fires the launch check without awaiting it. Every updater event runs through the pure fold `nextUpdateState`. Each transition lands in the held state and broadcasts through `pushUpdatesChanged`. The renderer asks `updates:get` in the root loader and listens on `updates:changed`, writing both into the query cache, so a late mount and a live push read the same answer. The card renders only in ready. Choosing restart sends `updates:restart`, and the handler calls the port's `quitAndInstall` only while ready holds.

The fold makes ready absorbing. After a download finishes, every signal but the restart is identity, and the adapter stops its interval. The next launch checks again. This trades freshness for safety: the alternative, checking past ready, restarts the download of the version already on disk and discards it (electron-builder#3003, #2006).

The interval is one `setInterval` at a named hourly constant, cleared in the `dispose` arm `registerAppLifecycle` runs on `before-quit`. Overlap needs no extra guard: `electron-updater` coalesces a check fired while one runs, and ready absorbs everything else. A machine sleeping past several ticks wakes to at most one in-flight check for the same reason.

## Data model and contracts

`packages/contracts/src/ipc.ts` gains:

```ts
export const updateStateSchema = z.discriminatedUnion('standing', [
  z.strictObject({ standing: z.literal('quiet') }),
  z.strictObject({ standing: z.literal('downloading'), version: nonBlankString }),
  z.strictObject({ standing: z.literal('ready'), version: nonBlankString }),
]);

export type UpdateState = z.infer<typeof updateStateSchema>;
```

- `'updates:get'` joins `ipcChannels` with request `z.void()` and response `ipcResult(updateStateSchema)`.
- `'updates:restart'` joins `ipcChannels` with request `z.void()` and response `ipcResult(z.void())`.
- `'updates:changed'` joins `ipcEvents` with `updateStateSchema` as payload.

State transitions, with ready absorbing:

| From        | Signal                          | To          |
| ----------- | ------------------------------- | ----------- |
| quiet       | available(version)              | downloading |
| quiet       | checking, not-available, failed | quiet       |
| downloading | downloaded(version)             | ready       |
| downloading | failed, cancelled               | quiet       |
| ready       | anything but the restart        | ready       |

No failure arm crosses the bridge. A failed check is log-only by requirement, and a state the renderer must never render doesn't belong in the contract.

## Error handling

- **The feed refuses, answers junk, or the network is down.** The updater emits `error` or the check promise rejects. Both route into `updateLog.failed('check', reason)`, which writes the operation, the updater's reason, and the feed constant. The fold maps the failure to quiet. Nothing surfaces.
- **A download fails or cancels.** Same log shape with `'download'`, fold returns quiet, and the next interval tick tries again.
- **The restart channel fires outside ready.** The handler answers an `ipcFailure('no-update-waiting', …)` and installs nothing, so a stale window can't restart the app for no reason.
- **An `error` emission with no check in flight.** The listener exists from before the first check, unconditionally, so the process survives by construction. A spec drives this exact case.
- **A channel that never updates itself.** Not an error. One launch log line names the channel, and no updater, interval, or control exists.

## File map

- `packages/contracts/src/ipc.ts`: the state union, two channels, one event (modify).
- `packages/contracts/src/ipc-updates.test-d.ts`: type-level spec pinning the union and the channel shapes (create).
- `apps/desktop/src/main/updates/update-channel.ts`: pure channel policy (create).
- `apps/desktop/src/main/updates/update-standing.ts`: pure fold with ready absorbing (create).
- `apps/desktop/src/main/updates/update-log.ts`: the log shape and the `electron-updater` logger adapter (create).
- `apps/desktop/src/main/updates/wire-app-updater.ts`: the adapter over the injected updater port, the interval, the held state (create).
- `apps/desktop/src/main/ipc/updates-ipc.ts`: the handler group answering `updates:get` and `updates:restart` (create).
- `apps/desktop/src/main/ipc/push-events.ts`: `pushUpdatesChanged` in the broadcast form (modify).
- `apps/desktop/src/main/ipc/register-ipc.ts`, `apps/desktop/src/main/ipc/dispatch.ts`: register the group and the channel names (modify).
- `apps/desktop/src/main/index.ts`: compute the channel, wire the adapter, dispose the interval (modify).
- `apps/desktop/src/preload/index.ts`, `apps/desktop/src/preload/index.d.ts`: bridge entries for both channels and the event (modify).
- `apps/desktop/src/renderer/src/shared/api/updates.ts`: query options, cache binding, restart mutation (create).
- `apps/desktop/src/renderer/src/shared/api/index.ts`: re-export (modify).
- `apps/desktop/src/renderer/src/shared/ui/icon/icon.tsx`: the `arrow-up` glyph (modify).
- `apps/desktop/src/renderer/src/widgets/app-update/ui/update-ready-card/update-ready-card.tsx`: the card (create).
- `apps/desktop/src/renderer/src/widgets/app-update/ui/update-ready-card/update-ready-card.stories.tsx`: the stories sibling (create).
- `apps/desktop/src/renderer/src/widgets/app-update/index.ts`: the widget's public API (create).
- `apps/desktop/src/renderer/src/app/routes/__root.tsx`: the loader line, the cache binding, the sidebar mount (modify).
- `apps/desktop/package.json`: `electron-updater` as a runtime dependency, pinned to 6.x (modify).
- `apps/desktop/e2e/features/updates/channel.feature`, `waiting.feature`, `checks.feature`: graduated unchanged from `gherkin/updates/` (create).
- `apps/desktop/e2e/steps/updates-channel.steps.ts`, `updates-waiting.steps.ts`, `updates-checks.steps.ts`: the step pairs (create).
- `apps/desktop/e2e/update-feed-stub.ts`: the local feed server and the `dev-app-update.yml` writer (create).

## Interfaces

- Consumes: `AppUpdater` events and members from `electron-updater` 6.x (`error`, `checking-for-update`, `update-available`, `update-not-available`, `update-downloaded`, `update-cancelled`, `checkForUpdates()`, `quitAndInstall()`, `autoInstallOnAppQuit`, `logger`, `forceDevUpdateConfig`); `ipcResult` and `nonBlankString` from `@recompose/contracts`; the `HandlerWiring` shape in `register-ipc.ts`; `bindSettingsToCache` as the renderer pattern.
- Produces:
  - `updateChannelFor(platform: NodeJS.Platform, env: NodeJS.ProcessEnv, isPackaged: boolean, inApplicationsFolder: boolean): UpdateChannel` with `type UpdateChannel = 'self' | 'package-tool' | 'none'`.
  - `nextUpdateState(state: UpdateState, signal: UpdaterSignal): UpdateState` with `UpdaterSignal` as a closed union mirroring the updater events.
  - `updateLogFor(feedAddress: string): { logger: UpdaterLogger; failed(operation: 'check' | 'download' | 'install', reason: string): void }`.
  - `wireAppUpdater(deps: { updater: UpdaterPort; log: UpdateLog; push: (state: UpdateState) => void; intervalMs: number }): { state(): UpdateState; restart(): boolean; dispose(): void }` where `UpdaterPort` is the injected boundary.
  - `createUpdatesIpcHandlers(wired: { state(): UpdateState; restart(): boolean }): UpdatesIpcHandlers`.
  - `pushUpdatesChanged(state: UpdateState): void`.
  - Renderer: `updatesQueryOptions`, `bindUpdateStateToCache(queryClient: QueryClient): () => void`, `useRestartForUpdate()`, and `UpdateReadyCard`.

## Decisions

### 1. The updater rides an injected port

`wireAppUpdater` never imports `electron-updater`. The composition point hands it the real singleton, and specs hand it an emitter double. The rule that doubles live only at real process boundaries holds, because the updater is the network and the filesystem.

**Alternatives considered:** importing the singleton inside the adapter, rejected because `electron-updater` resolves Electron APIs at import and the module would only load inside Electron.

### 2. The e2e feed is a local server behind `forceDevUpdateConfig`

The step fixture starts a local HTTP server serving a crafted `latest-<platform>.yml`, writes `dev-app-update.yml` with the server's address, and launches the app with the flag on. The packaged files already exclude that filename. Update scenarios run in one worker, because the file is one per application path.

**Alternatives considered:** calling `setFeedURL` from test wiring, rejected because the production rule stays "never call it" and a test-only code path would smuggle the exception in.

### 3. The restart proof runs packaged, on Linux, tagged

"The person chooses the restart" ends on the new version, which only a packaged copy can prove. The scenario carries a `@packaged` tag: the packaged project greps for it, and the acceptance project inverts it. The Linux runner builds the current AppImage plus a version-bumped twin and serves the twin from the local feed.

**Alternatives considered:** proving the restart in the development run, rejected because an unpackaged copy can't replace itself and the assertion would stop at the quit.

### 4. Channel scenarios prove where their channel exists

The deb and AppImage rows are Linux facts, so `channel.feature` steps skip on other platforms. The policy's full row table is platform-free and proves at the unit layer on every runner.

**Alternatives considered:** faking `process.platform` inside the launched app, rejected as an untyped seam that tests a configuration no person runs.

### 5. The log binds to the console

`updateLogFor` writes through the console idiom `apps/desktop/src/main/index.ts` already uses, and the e2e step reads the launched process's output. No file target and no `electron-log` dependency until a real support case asks for one.

**Alternatives considered:** adding `electron-log`, rejected because the required interface is three methods and the app already has a log idiom.

### 6. The card copy ships as drawn

The card's strings pass the `ux-writing` review at implementation. The versions line names both versions, because that answers the question a person actually has.

**Alternatives considered:** a sentence naming only the waiting version, rejected against the n8n reference in discovery.

## Test matrix

| Layer          | What this layer proves (or why none)                                                                                                                                           | Check command                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Unit           | Every `updateChannelFor` row including `undefined` inputs; every fold transition including ready absorbing; the log line carries operation, reason, and feed                   | `pnpm --filter @recompose/desktop exec vitest run --project unit` |
| Integration    | The adapter against an emitter double: listener attaches before the first check, transitions push, restart only in ready, dispose clears the interval, a bare `error` survives | `pnpm --filter @recompose/desktop exec vitest run --project unit` |
| End-to-end     | The three graduated features against the local feed; the packaged restart proof on Linux                                                                                       | `pnpm --filter @recompose/desktop run test:e2e`                   |
| Property       | `updateChannelFor` over platform, env, and flag permutations, with a deterministic twin carrying mutation duty                                                                 | `pnpm --filter @recompose/desktop exec vitest run --project unit` |
| Mutation scope | `update-channel.ts`, `update-standing.ts`, `update-log.ts` survive the diff-scoped Stryker gate                                                                                | push-time lefthook gate                                           |

## Task decomposition hooks

- Task 1: contracts (depends on: none, hands off: `UpdateState`, channel names, the type spec).
- Task 2: channel policy (depends on: task 1, hands off: `updateChannelFor`).
- Task 3: standing fold (depends on: task 1, hands off: `nextUpdateState`, `UpdaterSignal`).
- Task 4: log module (depends on: none, hands off: `updateLogFor`).
- Task 5: adapter (depends on: tasks 2 to 4, hands off: `wireAppUpdater`).
- Task 6: main wiring (depends on: task 5, hands off: the handler group, the push, the preload entries, live channels).
- Task 7: renderer api (depends on: task 6, hands off: `updatesQueryOptions`, the binding, the mutation).
- Task 8: the card (depends on: task 7, hands off: `UpdateReadyCard` with stories and the sprite glyph).
- Task 9: the mount and the scheme check (depends on: task 8, hands off: the card standing in the root layout, looked at in both schemes).
- Task 10: e2e graduation (depends on: tasks 6 to 9, hands off: the three feature-step pairs and the feed stub).

The reserved release tail sits outside these tasks, and each piece reaches the maintainer as an exact diff. The five pieces: the sha512 gate, the attestation widening, the notarization flip, the config specs, and the per-architecture macOS build behind its spike.

## Risks

- [Risk] `electron-updater` 6.x typings drift from the docs site → Mitigation: the design reads the installed `.d.ts`, and decision 1 keeps the surface behind one port.
- [Risk] The dev feed fixture races parallel workers over one `dev-app-update.yml` → Mitigation: update scenarios run in a single worker, per decision 2.
- [Risk] The packaged restart proof costs a second build on the Linux runner → Mitigation: the twin build reuses the compiled output and only re-runs electron-builder with a bumped version; if the cost still breaks the suite budget, that becomes a maintainer ask.
- [Risk] The ready-absorbing fold hides a newer release for long-running sessions → Mitigation: accepted at gate 1; the next launch checks again.
- [Risk] `mise exec vale` and cspell blind spots inside worktrees mask prose defects in authored artifacts → Mitigation: Vale runs explicitly on every authored file before commit.

## Migration and rollout

None. No stored document changes shape, the updater state lives in memory, and the feature ships dormant on Windows and deb installs.

## Open questions

None. The four questions the gate-1 document left open resolve in decisions 2 to 6.

## End-to-end verification

Build the AppImage, serve a version-bumped twin from the local feed, and run the packaged scenario. The card appears naming the twin's version while the person's work keeps focus. The restart lands on the twin, and the log of a refused check carries the reason and the feed address. Review criteria: the three graduated features pass on the Linux runner, and no dialog or focus steal appears anywhere. The card matches the four frames in `designs/recompose.pen` in both schemes through `claude-in-chrome`. The diff-scoped mutation gate reports no surviving mutant on the three mutate-listed modules.
