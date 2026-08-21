# 0152: Signing stops waiting on a revocation answer

**Status**: Superseded by [0157](0157-the-mac-leg-goes-back-to-the-standard-flow.md)
**Date**: 2026-08-21

## Context

Three tags hung in the same place. `build:mac` printed its signing line and then produced nothing
until a person cancelled it: twenty-four minutes, twenty-eight, and eighteen.

Two readings came and went.
[0150](0150-the-release-build-signs-without-a-network-monitor.md) took a network monitor out of the
path and the next tag hung anyway. [0151](0151-the-release-builds-its-own-signing-keychain.md)
built the keychain by hand so `codesign` would take the key without a prompt, and the tag after
that hung anyway. Both records changed something worth changing. Neither was the fault.

One piece of evidence survived every attempt. In the first cancelled log, `/usr/bin/security`
asked for `ocsp2.apple.com` one second after signing opened, and the silence began there. That
lookup is the revocation check `codesign` makes against its own signing certificate. It stayed in
the picture after the monitor left, because the call belongs to signing rather than to any action.

A responder that answers late is worse than one that never answers. A refused connection trips the
soft failure and the check gives up. A connection that stays open leaves the check waiting, and
nothing above it sets a deadline.

## Decision

**The runner stops asking about the standing of its own certificate.** The macOS step writes
`OCSPStyle None` and `CRLStyle None` into `com.apple.security.revocation` before it builds. The
signature this produces is byte for byte the one the previous attempts would have produced. What
goes away is a question the build machine asks about a certificate it already holds, and every
machine that opens the app still asks its own.

**A watchdog reports what a hang waits on.** Seven minutes into the step, a background shell lists
the signing processes and samples `codesign` if it still stands. A fourth hang then arrives with a
stack rather than a guess, inside the 45 minute limit
[0150](0150-the-release-build-signs-without-a-network-monitor.md) set.

## Alternatives

- **Waiting longer**: rejected. Three runs spent seventy minutes between them proving the wait has
  no natural end.
- **Building one architecture**: rejected. It halves the signing rather than fixing it, and the
  download page offers both.
- **An older runner image**: rejected without evidence. `macos-26` is new enough to suspect, and
  nothing so far points at it.

## Consequences

**Good**: signing either finishes or fails, and a hang now leaves a stack behind. The three
records that led here each removed something that deserved removing, so the workflow is better
than it was even where the diagnosis missed.

**Bad, and accepted**: the runner no longer notices a revoked signing certificate. Such a
certificate would sign a release and fail later, at the notary or on a user's machine. The
maintainer holds one certificate and would know. This record also spends a fourth run on a theory
the evidence supports rather than proves, which is why the watchdog ships beside it.
