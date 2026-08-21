# 0154: The mac leg waits for Apple's notary

**Status**: Accepted
**Date**: 2026-08-21

## Context

Six tags failed to produce a release. Each time `build:mac` printed its signing line and then went
quiet, and each time a person cancelled it: twenty-four minutes, twenty-eight, eighteen, eleven.
Three records read that silence as a fault in signing.
[0150](0150-the-release-build-signs-without-a-network-monitor.md) removed a network monitor,
[0151](0151-the-release-builds-its-own-signing-keychain.md) built the keychain by hand, and
[0152](0152-signing-stops-waiting-on-a-revocation-answer.md) turned off the revocation check. None
of them changed the silence.

The sixth tag ran to the 45-minute limit instead of a cancel, and the last line of the log named
what nobody had seen:

```text
Cleaning up orphan processes
Terminate orphan process: pid (26808) (notarytool)
```

Signing had finished. `notarytool` was alive and waiting on Apple. The signing line is simply the
last thing electron-builder prints before it hands the app to the notary, and the notary answers
when it answers. Every hang was a queue, and every cancel threw away a submission the notary had
already taken.

The one instrument that found this was the process dump from
[0153](0153-the-workspace-installs-every-architecture-a-release-ships.md), and only because that run ended on its
own.

## Decision

**The build waits two hours.** `timeout-minutes` moves from 45 to 120. The release signs and
notarizes two architectures, and Apple sets the pace for both.

**The step reports a heartbeat.** Every five minutes it names the signing and notary processes
still alive, so a quiet log reads as progress rather than as a hang. Silence with no process named
is now the thing to act on.

The signing work from records 0150 through 0152 stays. None of it was the fault, and each removed
something that had no business in a release build.

## Alternatives

- **Notarizing outside the build**: rejected. It splits one artifact across two jobs and leaves a disk
  image without its ticket between them.
- **Turning notarization off**: rejected. Gatekeeper refuses an app with no ticket on first open,
  and the README promises that ticket.
- **A shorter limit with a retry**: rejected. A retry resubmits work the notary already holds, and
  the queue is the cost either way.

## Consequences

**Good**: a release finishes instead of dying at the halfway point, and the log says so while it
works. Six runs of guesswork end with a fact.

**Bad, and accepted**: a genuine hang now holds a runner for two hours before the limit ends it.
The heartbeat is what shortens that in practice, because a stall with no notary process alive
shows within five minutes. A slow day at Apple also becomes a slow release, and nothing in this
repository can change that.
