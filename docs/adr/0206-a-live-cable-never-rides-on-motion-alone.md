# 0206: A live cable never rides on motion alone

**Status**: Accepted
**Date**: 2026-08-26

## Context

The maintainer reported on 2026-08-26 that the green cables never flowed on Linux. They added that they were still unsure the animation was reliable. The traveling pulse is the app's signature reading. It's the one mark on the canvas saying a request moves through a binding right now.

Three facts explain the report. All three sit in the renderer rather than in the engine.

The pulse paints nothing when motion stands down. `cable-pulse` in `theme.css` sets `opacity: 0`, then lifts it to `1` inside `@media (prefers-reduced-motion: no-preference)`. The travel rides in that same guard. Under the reduce preference the whole indicator turns transparent rather than merely still.

The standing behind it doesn't survive that. `pulseForStanding` records the opposite intent. Riding over the cable rather than breaking it into dashes was the plan for outliving the pulse. That plan doesn't hold. `--color-cable-live` and `--color-cable-served` both resolve to `--green-500` in the dark scheme. A live cable and a served cable then paint alike. The light scheme separates them by one step of green. With the pulse transparent, a request in flight reads like one that finished a minute ago.

No gate could catch it. Architecture Decision Record (ADR) 0079 runs the whole browser suite under the reduce preference. That's the right call for determinism, and it exercises the guard through the door a person uses. Its own recorded cost was that no test anywhere exercises an animation. The traffic scenario went further and pinned the failure as expected. It asserted the pulse's opacity was `0` whenever the suite stood still.

Linux is where a person meets this without asking for it. Chromium derives the preference from one desktop setting there. Chromium's own default is no preference when it finds no setting, so a bare session isn't the cause. A desktop answering the question wrongly is. One current mainstream distribution carries an open fault where the settings portal reports animations off while the desktop shows them on. Every application trusting that portal inherits a reduce nobody chose. macOS and Windows read a dedicated accessibility flag that ships off, which is why the reading held there.

The guidance is one-sided. Media Queries Level 5 asks for the removal of non-essential motion. Web Content Accessibility Guidelines (WCAG) 2.3.3 carries an exception for animation essential to the information. It asks authors to carry that information another way rather than drop it. WebKit's note on shipping the query says to show another visual indicator for the intended meaning. Hiding the indicator is the one treatment every source rules out.

## Decision

**A live cable never rides on motion alone.** The pulse paints whether it travels, and reduced motion takes the travel and nothing else.

The utility paints the bead and guards the travel alone. `cable-pulse` now sets `opacity: 1` outright, and only `animation` sits inside the no-preference guard, the way `sonar-ring` already handles the same question in that stylesheet. Under the reduce preference the bead holds still at the head of the cable. A static mark is no vestibular trigger. Under no preference nothing changes, because the travel still runs.

A new scenario replaces the one that pinned the old reading. It states the rule: a request in flight stays readable on a machine asking for no motion. The suite runs under reduce, so that scenario is the only thing standing between this reading and the canvas. It asserts the opacity and the visibility directly.

## Consequences

**Good**: the signature reading survives on every machine. That includes the Linux desktops asking for reduced motion on a person's behalf. A person with a real motion sensitivity keeps the accommodation they asked for, because the travel goes and the bead holds still. The suite now proves the reading rather than documenting its absence.

**Bad**: a reader meets a bare `opacity: 1` and has to reach the comment above the utility to learn why it can't move. That comment is the only thing standing between this reading and someone tidying the value back inside the guard.

**Good, and unplanned**: the onboarding diagram's own pulse was invisible under the same preference for the same reason. Fixing the utility cured it without anyone touching that file.

## Alternatives

**Paint the opacity on the cable component instead.** Rejected because it patches one caller of a utility whose own rule is wrong. The onboarding diagram draws the same pulse and would have stayed invisible, and the next component reaching for `cable-pulse` would inherit the defect a third time. An inline style is also the heaviest override in the file for a value the stylesheet should simply state.

**Give `--color-cable-live` a tint separating it from `--color-cable-served` in both schemes.** Rejected as the whole answer, and wanted anyway. Color would then carry the standing when the pulse stands down. Two greens one step apart are a thin reading for a state this important. It also does nothing for a person who can't tell those greens apart. It belongs beside this decision rather than instead of it.

**Force the preference off for the whole app.** Chromium offers a switch pinning no preference regardless of the system. Rejected because it overrules a real accessibility setting for everyone. It would work around one desktop's reporting fault by taking the accommodation from the people who asked for it.

**Leave it and treat the report as a Linux packaging fault.** Rejected because the reading already went missing for anyone turning reduced motion on by choice, on every platform. The desktop fault only decided who met it first.

## Follow-ups

The same reasoning reaches any other surface saying something is happening through motion alone. Nothing else on the canvas does it today. The rule this record states is the one to check them against.
