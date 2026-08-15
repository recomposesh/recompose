# 0122: A launch decides whether its window shows

**Status**: Accepted
**Date**: 2026-08-15

## Context

A local acceptance run exports `RECOMPOSE_WINDOW_STAYS_BACK=1`. A run launches the app dozens of
times, and each launch that comes to the front takes the keyboard off the person at the machine.

The marker doesn't order the window behind others. `main-window.ts` reads it and skips `show()`
altogether:

```ts
mainWindow.on('ready-to-show', () => {
  if (!windowStaysBack) {
    mainWindow.show();
  }
});
```

So `BrowserWindow.isVisible()` stays false for the life of that app.

One scenario asserts the opposite. "It never paints light first" polls `windowVisibility` until it
reads true, which is how it proves the window waits for content and then arrives already dark. Under
the marker that poll can never pass.

The two met through `inheritedEnv`, which copies the whole parent environment into every launch. The
fixture sets the marker per launch, and only when `CI` names no run. The restart in `launchFrom`
never set it, which left the restarted app free to show its window. A shell that exports the marker
globally reaches that launch anyway and leaves the window invisible forever.

Measured: the scenario fails the same way with every change on this branch stashed, so the conflict
predates them. It passes on continuous integration, where nothing exports the marker and the fixture
declines to set it.

## Decision

`launchFrom` sets `RECOMPOSE_WINDOW_STAYS_BACK` to the empty string, which `staysBack` reads as
false, because it tests for exactly `'1'`.

A launch decides whether its own window shows. The fixture already worked that way, opting its
application in. The restart opts out, for the reason the scenario exists: a restart that shows
nothing proves nothing about what a restart paints.

The general rule this settles is about `inheritedEnv` rather than about one marker. It copies the
whole parent environment into every launch, so a shell that exports anything reaches launches that
never asked to read it. A marker that a launch decides for itself therefore has to name itself again
at that launch, in both directions. The fixture names it to opt in. The restart names it to opt out.
A launch that names nothing is a launch the shell decides for, whether anybody intended that or not.

The local run and continuous integration now agree on this scenario, and the marker still holds back
every launch that wants it.

## Alternatives

- **Dropping the marker from the local run**: rejected. It exists so a run doesn't take over the
  maintainer's screen, and a suite that steals the keyboard dozens of times is worse than a scenario
  that reads differently in two places.
- **Teaching the scenario to skip its visibility poll under the marker**: rejected. The
  scenario would then prove nothing on the machine that runs it most, and it would carry a branch on
  an environment variable, which is test logic reading its own harness.
- **Dropping `inheritedEnv` from `launchFrom`**: rejected as too wide. The restart needs the parent
  environment for everything else it inherits, and the conflict is about one marker.
- **Recording the conflict and leaving the scenario red locally**: rejected. A red that everyone
  learns to ignore is worse than no test, and this one sits in the file a person reaches for when
  the theme misbehaves.

## Consequences

**Good**: the scenario proves the same thing everywhere it runs. The marker keeps a clear meaning,
which is that a launch decides, rather than that a shell decides for every launch at once.

**Bad**: one window now appears on screen during a local run, for the length of that scenario. The
suite behaved that way before any shell exported the marker, so this restores an intent rather than
adding a cost. A person running the suite locally still sees it.

The wider trap stays open. `inheritedEnv` copies everything, so any marker a shell exports reaches
every launch, and only the ones a launch names again are safe. Nothing warns about the next one.
