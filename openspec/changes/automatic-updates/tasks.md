## Implementation tasks

Every task runs test-first. The failing run goes into the task report before the implementation
lands, and one green commit carries the pair. Tasks 2, 3, and 4 own disjoint files and run in
parallel once Task 1 lands. The release tail sits outside every task below: each of its pieces
reaches the maintainer as an exact diff before it lands.

### Task 1: The contract owns the state

- [ ] `packages/contracts/src/ipc.ts` holds `updateStateSchema` as the quiet, downloading, and
      ready union, the `updates:get` and `updates:restart` channels, and the `updates:changed`
      event
- [ ] `packages/contracts/src/ipc-updates.test-d.ts` pins the union's arms, that only downloading
      and ready carry a version, and both channel shapes
- [ ] `electron-updater` lands in `apps/desktop/package.json` dependencies, pinned to 6.x

### Task 2: The channel policy

- [ ] `apps/desktop/src/main/updates/update-channel.ts` holds
      `updateChannelFor(platform, env, isPackaged, inApplicationsFolder)`
- [ ] Specs prove every row: unpackaged answers none; darwin in the Applications folder answers
      self and outside it answers none; linux with a non-empty `APPIMAGE` answers self, with an
      empty or absent one answers package-tool; win32 answers none
- [ ] A property spec over platform, env, and flag permutations, beside its deterministic twin

### Task 3: The standing fold

- [ ] `apps/desktop/src/main/updates/update-standing.ts` holds `nextUpdateState` and the
      `UpdaterSignal` union
- [ ] Specs prove the transition table, and that ready absorbs every signal
- [ ] A property spec proves no signal sequence containing a downloaded signal ends anywhere but
      ready, beside its deterministic twin

### Task 4: The log contract

- [ ] `apps/desktop/src/main/updates/update-log.ts` holds `updateLogFor(feedAddress)`
- [ ] Specs prove a failure line carries the operation, the reason, and the feed address, and that
      the adapter shape satisfies the updater's logger interface

### Task 5: The adapter

- [ ] `apps/desktop/src/main/updates/wire-app-updater.ts` holds `wireAppUpdater` over the injected
      updater port
- [ ] Specs through an emitter double prove the `error` listener attaches before the first check
      and a bare `error` emission leaves the process running
- [ ] Specs prove each updater event pushes the folded state exactly once
- [ ] Specs prove `restart()` calls `quitAndInstall` in ready and answers false anywhere else
- [ ] Specs prove checking stops once ready holds and `dispose()` clears the interval
- [ ] Specs prove the launch check fires and nothing awaits it

### Task 6: The main wiring

- [ ] `apps/desktop/src/main/ipc/updates-ipc.ts` answers `updates:get` from the held state and
      routes `updates:restart`, refusing with `no-update-waiting` outside ready
- [ ] `pushUpdatesChanged` joins `push-events.ts` in the broadcast form
- [ ] The group spreads into `assembleIpcHandlers`, and `dispatch.ts` carries both channel names
- [ ] Both preload maps and `index.d.ts` carry the two channels and the event
- [ ] `index.ts` computes the channel, logs the one line for a channel another tool owns, wires the
      adapter only on self, and disposes it on quit
- [ ] Specs prove a non-self channel wires nothing and the get channel still answers quiet

### Task 7: The renderer reading

- [ ] `shared/api/updates.ts` holds `updatesQueryOptions`, `bindUpdateStateToCache`, and
      `useRestartForUpdate`, copying the settled settings pattern
- [ ] The barrel re-exports it, the root loader warms it, and `usePushedCaches` binds it
- [ ] Browser specs prove a pushed ready state lands in the cache and a late mount reads the same
      answer through the query

### Task 8: The card

- [ ] The `feature-sliced-design` decision tree confirms the widget placement before any file exists
- [ ] `widgets/app-update/ui/update-ready-card/update-ready-card.tsx` renders the flat washed
      header, the sparkles, the bordered tile with the new `arrow-up` glyph, both versions, and the
      one restart button, matching the four frames in `designs/recompose.pen`
- [ ] `shared/ui/icon/icon.tsx` gains the `arrow-up` glyph in the sprite's hand-drawn style
- [ ] The stories sibling covers ready in both schemes and the absent state
- [ ] The card renders only in ready, and the copy passes the `ux-writing` review
- [ ] Browser specs prove the card names both versions, the button fires the restart ask, and
      nothing renders in quiet or downloading

### Task 9: The mount and the look

- [ ] `__root.tsx` mounts the card in the sidebar under the Get started panel
- [ ] The card stands across navigation, and it stands after the Get started panel leaves
- [ ] A pass through `claude-in-chrome` in both color schemes, reading accessible names off the
      page rather than by eye

### Task 10: The whole loop

- [ ] `gherkin/updates/` graduates unchanged to `apps/desktop/e2e/features/updates/`, each feature
      landing in the same commit as its step file
- [ ] `e2e/update-feed-stub.ts` serves the crafted manifest and writes `dev-app-update.yml` with
      its address, and update scenarios run in one worker
- [ ] `steps/updates-checks.steps.ts` drives the refused feed, the launch check, and the interval,
      reading the reason and the feed address off the process output
- [ ] `steps/updates-waiting.steps.ts` drives the background download, the card, the navigation,
      and the still-downloading silence
- [ ] `steps/updates-channel.steps.ts` drives the deb and AppImage rows on the Linux runner and
      skips elsewhere
- [ ] The restart proof carries the `@packaged` tag, the packaged project greps for it, the
      acceptance project inverts it, and the Linux leg serves a version-bumped twin build
- [ ] Both written through the `playwright-best-practices` and `gherkin-best-practices` skills

### Closing

- [ ] The prose and spelling gates run once at the end, and one editing pass answers every finding
- [ ] The full local battery runs green before the branch reaches continuous integration
- [ ] The diff-scoped mutation gate leaves no survivor on a file this change wrote
