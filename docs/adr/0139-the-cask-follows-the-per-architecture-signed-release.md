# 0139: The cask follows the per-architecture signed release

**Status**: Accepted
**Date**: 2026-08-17

## Context

Record 0035 shipped phase A of the Homebrew story: an arm64-only cask in
`recomposesh/homebrew-tap`, rewritten by a `homebrew-bump` workflow that takes the first `dmg` it
finds on a published release. Records 0137 and 0138 then delivered what 0035 called phase B. Every
release now carries a signed and notarized `dmg` per architecture, named
`Recompose-<version>-<arch>.dmg`, and the installed app updates itself through its own channel.
The bump workflow predates that delivery: with two `dmg` files on a release it takes whichever
sorts first, writes one `sha256` for it, and pins the cask to `arm64` alone.

## Decision

**One cask serves both architectures.** The cask uses the Cask Cookbook's compact form: an `arch
arm: "arm64", intel: "x64"` stanza, a `sha256 arm:, intel:` pair, and one interpolated `url`. The
bump workflow resolves each architecture's `dmg` by name, hashes both, and halts loud when either
is missing.

**The cask declares `auto_updates true`.** An installed copy updates itself through `Squirrel.Mac`,
so a plain `brew upgrade` leaves it alone rather than reinstalling over a newer self-updated copy.
A person who wants Homebrew to force the tap's version passes `--greedy`.

**The official `homebrew-cask` migration keeps waiting**, unchanged from record 0035: the
notability bar decides that date, not this change.

## Alternatives

- **Two casks, one per architecture.** Rejected. The `arch` stanza exists exactly for this shape,
  and two casks double the bump surface for no gain.
- **`version :latest` without checksums.** Rejected. It trades away the only integrity check
  Homebrew performs on a third-party tap.
- **Homebrew's livecheck and autobump machinery.** Rejected as not applicable: autobump serves the
  official taps, while this tap already learns about a release from the `release published` event.

## Consequences

**Good**: Intel Macs install through Homebrew for the first time. Each artifact carries its own
pinned checksum. Homebrew stops fighting the app's own updater over who owns the version.

**Bad, and accepted**: the tap's version trails a self-updated install until the next publish, so
`brew reinstall` can step a person back one version between releases. A copy that a person installs
but never launches also never self-updates, and a plain `brew upgrade` skips it by design. The
README owns pointing those people at `--greedy`.
