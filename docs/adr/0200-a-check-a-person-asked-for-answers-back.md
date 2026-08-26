# 0200: A check a person asked for answers back

**Status**: Accepted
**Date**: 2026-08-26

## Context

Record 0133 wired `electron-updater` and gave the app one way to learn about a new version. It
checks at launch, then every hour. Those checks report nothing to anybody. A found version downloads
on its own and raises a card when it lands. A failed check writes one line to the log and stops
there. The contract said as much in as many words: `updateStateSchema` carried three standings, and
its docstring recorded that a failure stays out of the renderer by design.

That's the right behavior for a check nobody asked for. It's the wrong behavior for the menu item
the maintainer asked for. A person who chooses "Check for Updates" and sees nothing happen reads the
item as broken. Most checks find nothing, so that's what most people would see.

Sparkle set the expectation every Mac user brings to this item, and it draws exactly this line. Its
`checkForUpdates` runs when a person asks, and reports the outcome in an alert, failures included.
Its `checkForUpdatesInBackground` stays silent and hands failures to the delegate. Both run on one
updater over one feed. What differs is who asked.

So the app needs two answers over one feed. It needs them without the hourly check gaining a voice
it doesn't have today.

## Decision

**A check a person asked for reports back. A check nobody asked for stays as quiet as it stands today.**
Provenance is the whole rule, and it's the rule Sparkle already taught every Mac user.

**The standing and the report ride one snapshot as two fields.** `updateStateSchema` keeps its three
standings untouched, and every arm gains an optional `check`. That field holds its own four-armed
union: `asking`, `current`, `found` with the version, and `failed` with the reason. `updates:get`
and the `updates:changed` push carry both fields, so a window that opens late reads both from the
one channel that already existed.

**Two answers stay two fields rather than becoming six standings.** They answer different questions
over different lifetimes. Where the app stands against the feed is a fact about the app, and it
persists. How a check went exists because somebody asked, and it goes away. One union loses that
distinction. A manual check that finds a version has to reach `downloading`. The widget could then
no longer tell it apart from the hourly download it must never draw a card for.

**Only the manual path ever writes the report, and the fold can't.** The wiring holds the standing
and the report as two values, and `nextUpdateState` sees only the standing. A signal arriving with
nobody waiting clears the report and reaches the fold alone. The hourly check therefore has no path
to a window that doesn't already exist. That's a property of the module rather than a rule anyone
has to remember.

**The report clears when the world moves on.** A settled report survives until the next signal
nobody asked for, which the hourly check guarantees within the hour. The person can also dismiss it
in the window they're reading. Dismissal is local to a reader, so it stays in the renderer.

**The menu item is absent where the app owns no updates, and unavailable while a check runs.** A deb
install and an unpackaged run answer `none`, the word the channel table already uses. The item then
appears on no platform at all. While a check stands the item stays visible and unavailable. That's the
only honest way to disarm an item on macOS, because a hidden item's accelerator can still fire.

**macOS carries it directly under About in the application menu.** That's where every Mac app
carries it. Off macOS it trails the Help menu beside the About item. Windows and Linux readers
already look in Help for both, and this app already keeps About there.

**One surface reports every outcome.** The sidebar's update card renders the report when no version
waits to install. A downloaded version outranks any report about the check that found it. No second
update surface exists, and no dialog interrupts anybody.

## Alternatives

- **A one-shot result returned from an `updates:check` request.** Rejected. The trigger is a menu
  item, which lives in the main process, so nothing in a window ever issues the request. The outcome
  would arrive as a push anyway, and a push-only outcome is invisible to a window that mounts a
  second later. A field on the snapshot the surface already reads costs one optional key and
  survives a remount.
- **Widening `updateStateSchema` to six standings, with `checking` and `current` beside the three.**
  Rejected on the found case. A manual check that turns up a version has to land on `downloading`.
  That's the standing the hourly check reaches, and the one standing the spec says must draw
  nothing. Telling the two apart would push provenance into the renderer as remembered history.
- **A native message box from the main process, the way Sparkle draws it.** Rejected. It's a second
  update surface for an app that already has one. It would also be the only modal the update path
  raises, after 0133 spent its consequences on raising none.
- **Letting the hourly check surface failures too, now that a failure standing exists.** Rejected,
  and the module prevents it by construction rather than by discipline. A feed that goes down for an
  afternoon would otherwise put an error in front of a person once an hour, when nobody asked.
- **Disabling the menu item where the app owns no updates, instead of removing it.** Rejected. A
  permanently unavailable control tells a deb user nothing about why. Record 0133 already decided that
  channel reports no error and offers no control.

## Consequences

**Good**: the menu item behaves the way a Mac user expects, failure case included. That's the one
outcome most worth saying out loud, because somebody is standing there waiting for it. The hourly
check keeps every property record 0133 gave it, and specs now pin it by asserting that it pushes
nothing at all. No new channel crosses the process boundary, no new preload entry appears, and no
new event name joins the push vocabulary, so the fake bridge needed no edit.

**Bad, and accepted**: the update state now carries two facts, and a reader has to know which one
answers which question. A settled report can linger for up to an hour in a window nobody dismissed
it in. Dismissing it in one window leaves it standing in another, because dismissal belongs to the
reader. A person who asks for a check while a version already waits sees the item go unavailable and
hears nothing back, because the restart card outranks the report.
