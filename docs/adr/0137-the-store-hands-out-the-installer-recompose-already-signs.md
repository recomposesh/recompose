# 0137: The Store hands out the installer recompose already signs

**Status**: Accepted
**Date**: 2026-08-17

## Context

Record 0133 gave Windows two channels: an appx package the Microsoft Store re-signs during
certification, and the SignPath-signed Nullsoft Scriptable Install System (NSIS) installer on
GitHub Releases. Read against the Store policy text itself (version 7.19), policy 10.2.9 lets a
non-gaming product submit an HTTPS direct link to its own signed `.exe` installer. The self-update
prohibition at 10.2.5 scopes to games and Xbox products. An install through that route is an
ordinary NSIS install: `process.windowsStore` stays `undefined`, and the app can't tell a
Store-acquired copy from a downloaded one. The automatic-updates brainstorm on 2026-08-17 settled
which route recompose takes.

## Decision

**recompose submits to the Store through policy 10.2.9, pointing at the same SignPath-signed NSIS
installer GitHub Releases carries.** One Windows binary, one channel, one updater. The appx target
from record 0133 never lands.

**No `process.windowsStore` gate ships.** No recompose build can set the flag, so the gate would
guard an input that can't occur. The updates capability spec drops its "the Store owns a Windows
install" scenario for the same reason: the app can't detect a channel that doesn't exist.

## Alternatives

- **An appx submission, as record 0133 chose.** Rejected. It means a second artifact, a second
  certification schedule, and two channels that must carry the same version at the same time, a
  consequence 0133 itself named as a cost. The direct link delivers the Store listing with none of
  that.
- **A defensive `windowsStore` gate anyway.** Rejected. electron-updater doesn't support AppX, but
  the crash path it would guard needs an appx build that this decision removes. One dead row in a
  policy function is still speculation.

## Consequences

**Good**: one Windows artifact updates every Windows install the same way, whichever storefront
handed it out. The version drift between two Windows channels that 0133 accepted disappears. The
Store listing costs a submission form rather than a packaging target.

**Bad, and accepted**: the listing stands on policy 10.2.9 keeping its current shape, and
certification still answers on Microsoft's schedule. Policy 10.2.9 also requires that initiating
the install shows no installation interface, and the one-click NSIS installer needs verifying
against that clause before the submission. A Store-acquired copy updates itself, so the Store's own
listing never reflects the version a person runs.
