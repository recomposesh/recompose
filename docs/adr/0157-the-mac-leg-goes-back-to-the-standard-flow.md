# 0157: The mac leg goes back to the standard flow

**Status**: Accepted
**Date**: 2026-08-21

## Context

Nine tags failed to produce a release. The mac leg went quiet in every one, and four records read
that quiet as a fault in the build.
[0151](0151-the-release-builds-its-own-signing-keychain.md) took the keychain away from
electron-builder. [0152](0152-signing-stops-waiting-on-a-revocation-answer.md) turned off the
revocation check. [0156](0156-the-release-asks-the-notary-on-its-own-schedule.md) replaced
notarization with a hook that submits, polls and staples on its own.

None of it was the fault. [0154](0154-the-mac-leg-waits-for-apples-notary.md) named the real one,
and Apple's own records agree. `notarytool history` shows submission after submission reading
`Accepted`, so the signature, the entitlements and the credentials were right from the first tag.
The service answers when it answers, and Apple documents the reason. Most uploads clear in
minutes, an in-depth analysis holds some of them back, and a team gets 75 submissions a day.

The workarounds then started costing more than they bought. A developer running `build:mac` on their
own machine hit `notarization halted: APPLE_API_KEY is empty`, because the hook demanded credentials
electron-builder used to ask for only when it had them. Submitting a fresh ticket every thirty
minutes spends a daily quota the team shares. None of that buys a release the standard flow wouldn't
have produced on a quiet morning.

## Decision

**The mac step goes back to what it was.** Guard the five secrets, write the API key to a file,
hand it to `build:mac`, delete it on exit. `mac.notarize` returns to `true`, which is
electron-builder calling `@electron/notarize` with the credentials it already has.

**The custom hook leaves.** `build/notarize.cjs` goes, `afterSign` goes with it, and a local
`build:mac` works again for anyone holding the certificate in their own keychain.

**The keychain and the revocation setting leave with it.** electron-builder builds its own keychain
from `CSC_LINK` and always did.

Three findings survive the misdiagnoses that turned them up.
[0150](0150-the-release-build-signs-without-a-network-monitor.md) keeps the network monitor out of
the release, because it hardened nothing on macOS while taking over name resolution.
[0153](0153-the-workspace-installs-every-architecture-a-release-ships.md) keeps the native binaries
the Intel image needs. [0154](0154-the-mac-leg-waits-for-apples-notary.md) keeps the long limit,
now 360 minutes on the mac leg and 45 on the others, because waiting is the only thing that ever
helped.

## Alternatives

- **Keeping the hook and guarding it with `CI`**: rejected. It fixes the local build and leaves the
  repository owning notarization for a problem it can't solve.
- **Keeping the manual keychain**: rejected. It answers a prompt that never appeared, and every
  line of it duplicates what electron-builder does with the same secret.

## Consequences

**Good**: the release does what the documentation says, a local `build:mac` works again, and the
next reader meets one path instead of four rounds of scaffolding. A slow morning at Apple is a slow
morning rather than a reason to rewrite the build.

**Bad, and accepted**: a dropped connection during `notarytool submit --wait` still ends the run,
which is what [0156](0156-the-release-asks-the-notary-on-its-own-schedule.md) set out to fix. That
has happened once in nine runs, and re-cutting the tag costs less than owning the notary. The
requests to drop `--wait` are open upstream on `electron/notarize`, so the fix belongs there.
