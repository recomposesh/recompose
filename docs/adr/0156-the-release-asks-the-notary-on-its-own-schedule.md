# 0156: The release asks the notary on its own schedule

**Status**: Superseded by [0157](0157-the-mac-leg-goes-back-to-the-standard-flow.md)
**Date**: 2026-08-21

## Context

[0154](0154-the-mac-leg-waits-for-apples-notary.md) found the notary behind six silent runs and gave
the mac leg two hours. The seventh used them, and for the first time the step failed with a message
rather than a cancel:

```text
⨯ Failed to notarize via notarytool. Failed with unexpected result:
Error: NSURLErrorDomain Code=-1009 "The Internet connection appears to be offline."
UserInfo={_kCFStreamErrorCodeKey=50,
NSErrorFailingURLStringKey=https://appstoreconnect.apple.com/notary/v2/submissions/f61204d5-…}
```

Error 50 is the network dropping under a request for the verdict on that one submission.
`notarytool submit --wait` had uploaded the app, spent fifty-two minutes asking Apple how it went,
and ended the run on a single failed question.

Apple's own record settles the rest. `notarytool history` lists five submissions from the cancelled
runs, every one `Accepted`, so the app, its signature, its entitlements and the credentials were
right the whole time. The same listing shows a submission from that morning sitting `In Progress`
past ninety minutes while Apple's status page reported no incident. Reports on
`electron/notarize#179` describe the same queue clearing on its own days later.

Two limits met in the middle. Apple takes as long as it takes. `@electron/notarize` passes `--wait`
with no retry around it, so a link held open for most of an hour has to survive every packet.

## Decision

**The build asks for the verdict itself.** `mac.notarize` turns off and an `afterSign` hook takes
over: `ditto` into a zip, `notarytool submit --no-wait` for a submission id, `notarytool info` every
thirty seconds, then `stapler staple` on the first `Accepted`. A question that fails is a question
to ask again, because Apple holds the submission whether the runner hears the reply or not.

**Half an hour of silence buys a second ticket.** The hook submits the same archive again every
thirty minutes and watches every submission it holds, taking whichever answers first. Uploading
again costs a minute, and a queue that swallowed one ticket has answered a second before. A
submission that comes back anything other than `Accepted` or `In Progress` fails the build with the
notary log attached, because that reads as a verdict rather than a delay.

**The mac leg waits as long as GitHub allows.** Its limit becomes 360 minutes, the ceiling every
hosted job shares and the most a workflow can ask for. Public repositories bill nothing for hosted
runners, so the wait costs a slot rather than money, and a release that finishes unattended beats
one somebody has to re-cut.

**Each architecture gets half the budget.** The hook gives up on a submission set after 150
minutes, because the leg notarizes twice and a first wait that swallowed the whole job would leave
the second nothing. Two waits of that length plus the build fit inside the ceiling.

The hook prints the submission id, so the log lines up with `notarytool history`, and it prints the
notary log when a submission comes back anything other than `Accepted`.

## Alternatives

- **A published action**: rejected after looking. The marketplace holds
  `samuelmeuli/action-electron-builder` and a row of forks, every one handing notarization back to
  electron-builder, and the notarize actions wrap `notarytool` without retrying it. The requests to
  drop `--wait` and to notarize asynchronously are open issues on `electron/notarize`, which is to
  say the ecosystem doesn't have this yet.
- **Retrying `build:mac`**: rejected. It resubmits work Apple already holds and pays for a full
  rebuild to survive one dropped packet.
- **Notarizing in a later workflow step**: rejected. electron-builder makes the disk image from the
  signed app, so the notary has to answer between those two, which is where `afterSign` stands.

## Consequences

**Good**: a dropped connection costs thirty seconds instead of an hour, a rejected submission names
its reason, and a slow morning at Apple no longer needs anyone watching.

**Bad, and accepted**: the repository now owns notarization that electron-builder used to hide, so
a change to `notarytool --output-format json` for `submit`, `info` or `log` breaks a release rather
than a dependency bump. A stuck queue can also hold a runner for most of a day before the limit
ends it, and the heartbeat is what makes that visible while it happens.
