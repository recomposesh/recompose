# 0085: Window chrome drags, and its controls opt out

**Status**: Accepted
**Date**: 2026-08-10

## Context

macOS opens the window with `titleBarStyle: 'hidden'`, so the platform draws no title bar and the renderer owes one. A bar becomes a title bar only because CSS says so. `app-region: drag` marks the rectangle the window moves by, and `no-drag` cuts a control back out of it. Electron states the rule plainly. A draggable area ignores all pointer events, and a button inside one needs excluding, "otherwise it would be impossible for users to click on them."

Two behaviors ride on that one declaration, and only one of them is obvious.

The first is the drag, which Chromium performs. The second is the double click that zooms the window. Windows gets that one free, because Chromium reports the region as `HTCAPTION` and the platform answers `WM_NCLBUTTONDBLCLK`. macOS answers nothing, and Electron issue 37789 has carried the gap open since 2023.

Architecture Decision Record (ADR) 0068 already put the region on every surface holding no gateway. It left one thing unwritten. The app closes the macOS gap itself: the renderer listens for a double click and decides whether it landed on bare chrome. It then asks the main process, which reads the person's `AppleActionOnDoubleClick` preference and zooms, minimizes, or does nothing.

The renderer decides "bare chrome" by walking up from the clicked element. The click counts when no `app-no-drag` ancestor stands between it and an `app-drag` ancestor. One declaration therefore moves the window and zooms it, and a bar that gets it wrong loses both at once.

The gateway toolbar got it wrong. It declared `no-drag` on its own container to keep its controls pressable, and that one declaration blanketed the bar. The address fills the strip, so the bar covered its parent's drag region edge to edge. The gateway detail surface had no draggable pixel and no double click that zoomed. Nothing caught it. The listener carried tests, but they used hand-built markup that already obeyed the rule, so nothing ever asked whether a real toolbar did.

## Decision

**A chrome surface declares `app-drag` on its own container, and every control on it declares `app-no-drag` on its own root.** Never the reverse. A container that declares `no-drag` to protect its contents takes the whole bar out of the window's reach. A region covers every pixel it spans, not only the gaps between its children.

**A control carries its own opt-out.** `ToolbarButton`, `SidebarToggle`, `InspectorToggle`, and the button group each declare `no-drag` where they're defined rather than where a bar uses them, so a bar built later can't forget one. `app-region` doesn't inherit. Only an element's own declaration or an ancestor's spares it, which is why a control nested inside a no-drag group needs nothing further.

**The rule answers to a real toolbar, not a sketch.** A story reads the painted region of the strip and of every direct child, so a control that arrives without its opt-out fails. A spec renders the real gateway surface under the real listener and double-clicks it. The shipping markup carries the proof, rather than a probe written to pass.

**macOS keeps answering the double click in the main process.** The renderer can't zoom a window, and it must not guess the preference. It reports the click, and the main process reads `AppleActionOnDoubleClick` and acts on the focused window. Off macOS it reads nothing and does nothing, because the platform's own title bar already answered.

## Consequences

**Good**: one CSS rule now carries a stated invariant instead of a habit, and tests read the shipping markup for both behaviors it feeds. A toolbar built next can't lose the drag by accident. The control components bring their own opt-out, and the story fails on a child that lacks one.

**Good**: the reported defect took one class to fix. It needed no new channel, no new handler, and no new preference reading, because the machinery already existed. Only its CSS contract had broken.

**Bad**: the invariant lives in class names that nothing type checks. A bar that misspells the class, or declares the region through another selector, passes every gate and loses both behaviors. The story guards the toolbar that exists rather than the next one.

**Bad**: the address fills the strip and opts out. What's left to grab is the band above and below the controls, plus the gaps between them. That's a thinner target than a platform title bar, and it's the cost of a bar that carries controls edge to edge.

**Bad**: no automated suite can assert a real double click. The window state depends on a machine preference and on the window holding focus, so that proof stays a manual check.

## Alternatives

**Declare the region once, high in the shell, and let every bar inherit it.** Fewer declarations, and it fails the same way. The shell already declares `drag` on the wrapper, and the toolbar's own `no-drag` still cancelled it. Moving a region up doesn't stop a descendant blanketing it.

**Wrap each control in a no-drag span at the point of use.** The surface holding no gateway does this, and it works. It also repeats the knowledge at every call site and forgets it exactly once, which is how this defect arrived.

**Give the bar a dedicated drag handle.** A strip of chrome that's the only draggable part makes the target explicit, and it shrinks that target further. It also reads as an invented control on a surface people expect to behave like a title bar.

**Ask Electron for the macOS behavior instead of building it.** Issue 37789 stays open. Waiting means the window doesn't zoom on the platform this app grows on.

## References

- [Electron: custom window interactions](https://www.electronjs.org/docs/latest/tutorial/custom-window-interactions)
- [Electron issue 37789: a double click on a draggable region doesn't zoom on macOS](https://github.com/electron/electron/issues/37789)
- ADR-0068: the standing sidebar carries the control that puts it away
