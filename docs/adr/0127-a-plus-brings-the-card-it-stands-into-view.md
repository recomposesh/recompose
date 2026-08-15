# 0127: A plus brings the card it stands into view

**Status**: Accepted
**Date**: 2026-08-15

## Context

`shownWhereItWasBorn` widens the view until a card born past the pane shows, and holds still when the card already shows. Only `committedPick` called it. The gateway's plus reached `birthedDraftAt` through `revealOn`, which selects the draft and opens the inspector. It moves no camera at all.

Driven through the app at its own default window of 1120x780, with the pane at 576x687 once the inspector opens, the plus stood a draft nobody could see. Four models standing seated the draft at `y = 600`, which left 29.7 pixels of a 78-pixel card below the pane. Five models seated it at `y = 750`, which left a 5-pixel sliver. The zoom read the same before and after the press in every run, in both color schemes. A draft paints as a dashed outline, so the press bought an inspector with fields to type into and no card to go with them.

The look itself carried a second fault, which the first one uncovered. It read the pane straight off `document.querySelector('.react-flow')` two frames after the birth. React hides a suspended subtree outright, stamping `display: none !important` on the host node. A hidden pane measures 0 by 0, which reads exactly like a card standing past it.

Standing the draft opens the inspector, and mounting the inspector suspends the page. The browser suite caught the whole sequence. The view zoomed to 1.41 around a card with 300 pixels of clearance, and four scenarios about dragging then read their seats through the wrong zoom.

## Decision

The gateway's plus shows the draft it stands, through the same `shownWhereItWasBorn` a completed pick already calls. A cable let go gets no such look. That's the line `seatOfTheBornTarget` already draws. A picker opened by a drop names its own point and hands the camera nothing, while one opened by an ask hands over the seat the canvas worked out.

The look waits for a pane it can measure. `paneTheCanvasShows` answers with nothing while the canvas measures zero. The look then waits on a `ResizeObserver` for the box to come back, rather than judging a canvas nobody can see. How long a page suspends is a question about data, so the wait is the platform's own rather than a count of frames.

Nothing else about the fit changes. The bounds are still every seat this side holds plus the born one, the padding is still `0.1`, and a card that already shows still moves nothing.

## Alternatives

- **Call the camera from `birthedDraftAt`, which both paths reach**: rejected. The drop path would inherit a look it doesn't want. A person who released a cable at the foot of the pane placed that card themselves, and pulling the canvas out from under the gesture is the opposite of what they asked for. The codebase had drawn that line for a completed pick already, and one door per intent keeps it visible at the call.
- **Count frames until the canvas comes back**: rejected. Twenty frames covered the suite's two-model page and missed its five-model one, which stayed hidden for thirty-six. Any number that passes today is one a slower query breaks, and the platform already reports the answer.
- **Read the flow's own measure instead of the pane**: rejected. The instance exposes its viewport and no size, so the only reading available is the one `fitBounds` takes internally, which it never offers.
- **Pan to the born card rather than zooming out**: rejected as a new rule. The canvas holds one answer for a card standing off-pane. A second answer would make the plus and the pick disagree about what a person sees after a birth.
- **Leave the plus alone and let the person find the card**: rejected. The card is a draft with an inspector open on it, so the press reads as having done nothing.

## Consequences

**Good**: a draft born below the fold arrives on screen, whichever path stood it. The look no longer fires on a hidden canvas, which was a live fault on the pick path too. Any pick landing while the page suspended widened the view for a card that showed fine.

**Bad**: the view moves under a person who was reading their composition at a zoom they chose. It moves further with every model the column gains. The 1120x780 window turns at four models, and every plus after that re-fits the whole composition.

The seat still comes from the column rather than from what shows. A tall composition keeps growing downward and keeps asking the camera to widen. Nothing here stops that. A canvas that wraps its column, or a seat that lands where a person is looking, is the repair if the zooming out becomes the complaint.
