# 0185: The shell reads which edge takes the window controls

**Status**: Accepted
**Date**: 2026-08-24

## Context

This shell wears window chrome drawn for macOS, and every platform gets it unchanged. On Windows
that leaves three faults on one screen.

The window asked for `titleBarStyle: 'hidden'` on macOS alone, so Windows kept its own title bar and
the renderer drew a second bar under it. That second bar is the 36-pixel band the sidebar clears for
the traffic lights (Architecture Decision Record (ADR) 0064). Windows draws none of those there, so
the band holds one control pinned to its far end, floating in an otherwise empty row.

The clearances point the wrong way. Both bars keep 90 pixels off their leading edge once the
sidebar goes, because that's where macOS floats its cluster. Windows stands close, maximize, and
minimize at the trailing edge instead, so the space one bar reserves is a hole on one side and a
collision on the other. An act at the trailing edge of the toolbar sits under the close button.

Two smaller faults ride along. The home invitation prints `or press ⌘ N` on every platform, naming
a key Windows keyboards don't carry. The font stacks name `-apple-system` and `SF Mono` with
`system-ui` and `monospace` behind them, so Windows falls through to a generic face rather than to
Segoe UI Variable and Cascadia Mono.

`SystemState` already refuses to carry the platform, and a spec pins that refusal. The reveal action
shows the pattern the codebase uses instead: the main process reads the platform once and answers
with a word, `finder`, `explorer`, or `file-manager`, and every surface conjugates that word.

## Decision

**Windows hides its title bar and takes the Window Controls Overlay.** `titleBarStyle: 'hidden'`
with `titleBarOverlay` leaves the caption buttons native, so Snap Layouts and the hover menu keep
working, while the rest of the row becomes the app's to paint. This is what Visual Studio Code,
Slack, and Discord ship.

**The strip stands as tall as the toolbar under it.** Windows centres the caption buttons in
whatever height the app names, so a 36-pixel strip over a 54-pixel bar centres them 9 pixels above
every control beside them. Matching the toolbar puts both on one centre, on a gateway's toolbar and
on the bar a surface holding no gateway paints alike.

**The overlay colors follow the scheme, and a scheme that turns repaints them.** Windows holds the
two colors the constructor names until something names them again, so a window opened light and
turned dark keeps dark symbols on a light bar. `titleBarOverlayFor` maps a scheme to the toolbar
surface and the ink over it, the constructor reads it once, and a `nativeTheme` listener repaints
for as long as the window stands.

**The renderer reads an edge, never a platform.** `windowControls` joins the system reading as
`leading`, `trailing`, or `none`, beside `shortcutKey` as `command` or `control`. The main process
maps the platform to those words once. Three pure functions turn the word into layout. One says
which end of the sidebar band holds the control. One says how far a bar holds its acts off each
edge. The last says whether a surface holding no gateway paints its bar at all.

**A surface holding no gateway paints its bar on Windows, whether the sidebar stands or not.**
ADR-0068 leaves that space bare while the sidebar carries the control, because a bar reporting
nothing reads as a mistake. Where the caption buttons stand on that space it's a title bar however
the app paints it, and leaving it bare floats three native buttons over the content surface.

**The sidebar's band carries the app title on Windows.** macOS fills that corner with the traffic
lights. Windows floats nothing there, so on every surface carrying a gateway the band stood empty
with the control alone at its far end. The name and mark the hidden title bar took away fill it,
which is what Visual Studio Code, Slack, and Discord draw in the same corner.

**The invitation prints the chord this machine holds.** `chordLabelFor` maps the modifier word to
`⌘` or `Ctrl`, and the home page hands the invitation the word rather than the invitation reading
the machine.

## Consequences

**Good**: Windows gets one bar rather than two, with the control at the edge that's free and every
act clear of the caption buttons. The shell states its layout in domain words that a spec can pin,
so a third platform answers by naming an edge. Nothing about the macOS shell moved, and neither did
its specs.

**Bad**: a hidden title bar and `autoHideMenuBar` don't work together, so the single Alt press no
longer brings the menu bar out
([electron#16379](https://github.com/electron/electron/issues/16379)). Every accelerator the menu
registers still answers, because the menu stays set whether it draws or not, and Windows already
hides the app menu by default. The caption clearance is a fixed 138 pixels rather than a
measurement, so a Windows release that changed its caption width would want that token changed with
it.

## Alternatives

**Keep the native Windows title bar and only fix the band.** Cheapest, and it leaves the shell with
two stacked bars: the platform's, then the app's. The empty row is exactly the fault worth fixing.

**Draw the caption buttons in the renderer over a frameless window.** Full control of every pixel,
and it costs Snap Layouts, the hover menu, and the accessibility the native buttons carry. Rejected
for the same reason the macOS chrome keeps its own controls.

**Add the Mica backdrop under the hidden title bar.** It's the Windows 11 answer to the macOS glass
this app already wears. Rejected on evidence: a frameless window with `backgroundMaterial` loses
its material, its rounded corners, and its shadow across a maximize and restore. The fix
([electron#46855](https://github.com/electron/electron/pull/46855)) is still unmerged on
Electron 43. A window that turns black once maximized is worse than a window with no backdrop.

**Read the overlay geometry from the `titlebar-area` CSS environment variables.** Chromium publishes
the exact caption rectangle, so the clearance would measure rather than assume. Rejected because
nothing defines those variables where the specs run, which would leave the layout unpinned in the
specs that guard it.
