# 0151: The release builds its own signing keychain

**Status**: Accepted
**Date**: 2026-08-20

## Context

[0150](0150-the-release-build-signs-without-a-network-monitor.md) read the first hang as a network
monitor standing between `codesign` and Apple, and took the monitor out. The next tag hung in the
same place. `build:mac` reached the signing line and produced nothing for twenty-eight minutes,
exactly as before. That record's own consequences called its evidence circumstantial and named the
next run as the proof. The proof came back negative.

The real cause is older and better documented. Since Sierra, `codesign` asks the keychain for
permission to use a key, and it asks through a window. A runner has no one to answer it, so the
process waits for a click that never comes. `electron/osx-sign` carries the report as a stall of
twenty to thirty minutes on a first signature, and `electron/packager` carried it before that.
Letting electron-builder create the keychain leaves that prompt in play.

## Decision

**The workflow builds the keychain before it builds the app.** The macOS step follows the block
GitHub publishes for signing on its own runners: decode the certificate, `security create-keychain`,
`set-keychain-settings -lut 21600`, `unlock-keychain`, `import ... -A -t cert -f pkcs12`,
`set-key-partition-list -S apple-tool:,apple:`, and `list-keychain -d user -s`. The partition list
is the line that matters. It records which tools may reach the key, so `codesign` takes it without
asking.

**electron-builder receives the keychain instead of the certificate.** `CSC_KEYCHAIN` names it and
`CSC_LINK` empties for the build, so nothing creates a second keychain behind the first. The step
still halts when any signing secret is empty, and it now also halts when `CSC_LINK` holds something
that isn't the base64 of a p12.

The keychain and both decoded files leave on a trap, whether the build passes or fails.

## Alternatives

- **Waiting the stall out**: rejected. The reports put it at twenty to thirty minutes on a first
  signature, and two runs cost fifty minutes between them. A release shouldn't turn on whether a
  window appears.
- **Retrying the build step**: rejected. It doubles the wait to work around a prompt that a
  documented command removes.
- **Reading the certificate straight into the login keychain**: rejected. A runner's login keychain
  belongs to the runner, and a temporary one deletes cleanly.

## Consequences

**Good**: signing takes the key without a prompt, so the macOS leg fails for reasons a log can
name. The release stops depending on a stall clearing on its own.

**Bad, and accepted**: the workflow now owns keychain setup that electron-builder used to hide, so
a change to how the repository keeps the certificate means editing the workflow too. The step assumes
`CSC_LINK` carries base64 rather than a path or a URL, which electron-builder would have accepted,
and it says so when the assumption breaks. This record leaves
[0150](0150-the-release-build-signs-without-a-network-monitor.md) standing: the monitor gave macOS
nothing and had no business in the path, and the job limit it added is what bounds a hang now.
