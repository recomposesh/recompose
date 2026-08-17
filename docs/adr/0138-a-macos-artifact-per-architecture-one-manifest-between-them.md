# 0138: A macOS artifact per architecture, one manifest between them

**Status**: Accepted
**Date**: 2026-08-17

## Context

Record 0133 chose a universal macOS build for two reasons. It closed the Intel gap the single
Apple Silicon runner left open. It also avoided the manifest collision where two per-architecture
runs each write a `latest-mac.yml` and the later overwrites the earlier, stranding the losing
architecture. The automatic-updates brainstorm on 2026-08-17 revisited the choice. electron-updater
downloads a macOS update differentially only when the cached zip of the last update still stands.
It falls back to the whole zip on the first update and after any failure. A universal bundle
carries both architectures through every one of those full downloads, and widens every
differential distance too.

## Decision

**The macOS release leg builds both architectures in one electron-builder invocation.** One run
with `--x64 --arm64` produces a `dmg` and a `zip` per architecture and writes a single
`latest-mac.yml` naming both zips. electron-updater picks the file matching its own architecture,
a selection its changelog pins to 4.5.2 (electron-builder#6212), well below the pinned 6.x.

**A spike proves the cross-architecture native-module story first.** `koffi` and `@node-wreq` ship
native binaries, and the single `macos-26` runner is Apple Silicon, so the spike must install and
update an x64 artifact on Intel hardware before the workflow change lands.

## Alternatives

- **The universal build, as record 0133 chose.** Rejected. Every update downloads the whole app,
  so the universal bundle taxes every person on every update to spare them one choice at install
  time.
- **Two runners, one per architecture.** Rejected. Each run writes its own `latest-mac.yml` and the
  later upload overwrites the earlier, which is the stranding 0133 set out to avoid, and a
  hand-rolled manifest merge step adds a maintenance burden that never ends.

## Consequences

**Good**: a person downloads only the architecture they run, and every full download an update
falls back to carries one architecture instead of two. The Intel gap closes. One manifest leaves
the release run, so nothing merges and nothing overwrites.

**Bad, and accepted**: a person picks their architecture on the release page. A wrong pick hides
behind Rosetta until the next update moves them to native arm64, a correction that self-heals but
surprises. The workflow change waits on the native-module spike, and an x64 build from an arm64
runner stays untrusted until that spike passes on Intel hardware.
