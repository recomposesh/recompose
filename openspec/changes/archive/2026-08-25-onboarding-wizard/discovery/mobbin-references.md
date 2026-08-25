# Mobbin references

Session-run discovery arm. Every wizard screen is already drawn in `designs/recompose.pen`, so
this pass does not shop for layouts. It checks the four screens whose pattern is load-bearing
against what shipped products do, and it names the two places where the drawing departs from
the convention.

## The tool picker, screens 02 and 03

### Deel, Selecting apps

<https://mobbin.com/flows/d85549a9-a2f8-4b77-acc6-342d21073dcf>

The closest published analogue to screen 02. A question as the heading ("What apps do you use
in your company?"), a stepper across the top with a check on every finished step, a searchable
grid of app cards on the left, and the running selection listed on the right. `Back` and `Next`
sit at the bottom right.

Take: the question-as-heading and the grid of mark-plus-name cards match what the pen already
draws. Two departures worth naming at gate 1.

- Deel splits its catalog across four stepper steps, one per category. recompose puts all four
  headings on one screen. Ours is the better call for sixteen entries, and it is why the
  progress dots count journey beats rather than categories.
- Deel mirrors the selection into a second column. recompose relies on the checkbox in the card
  corner plus the running count in the primary button (`Continue with 2 harnesses`). The count
  in the button carries the same reading with none of the second column's cost.

### ClickUp, Onboarding

<https://mobbin.com/flows/52f158f3-6529-4e6a-b936-4f057f4e3136>

A modal wizard with a bare progress bar, `Back` on the left, and the primary on the right that
renames itself on the last step (`Invite`, then `Finish`).

Take: the primary renaming itself per step is the same device as our `Continue with N
harnesses` and `Point your harnesses at it`. Confirms the pattern reads.

## The provisioning list, screens 10, 11, and the new 10b

### Ferndesk, Setting things up

<https://mobbin.com/screens/c841f11c-8628-4589-8103-ce2817405d90>

Carries the same heading recompose drew, down to the ellipsis. Three rows, each with a leading
disc: green check for done, hollow spinner for running. A thin bar above the list tracks the
whole run.

### Rox, Creating New Organization

<https://mobbin.com/screens/2765349a-ad9b-4e88-9086-8558825e2977>

Five rows with a `(1/5)` counter beside the heading. Rows below the running one are drawn at
reduced contrast rather than hidden, which is exactly the treatment the pen uses for
`Composing claude-my-model`.

### Klaviyo, Your welcome series flow is being created

<https://mobbin.com/screens/2c5821d6-134b-4b97-a81f-46a3d6f56a4d>

Adds one line the pen does not carry: "Stay on this page. This process can take a few moments."

Take: three products converge on the same three-state row, so the drawing is on the convention.
None of the four references draws a failure. That is the gap 10b now fills, and no shipped
reference stands behind its shape, so gate 1 should look hardest at that frame.

## Waiting on the first request, screen 13

### Grok, Let's get you up and running

<https://mobbin.com/screens/b774d416-54be-49a0-916f-fdd3268936a0>

The one published screen that solves the same problem. An amber dot and the label "Waiting for
your first request..." sit as a small pill above the heading, with a copyable curl panel beside
it. The person is already inside the product; the pill flips when the request lands.

Take: this is the strongest challenge to the drawn design. recompose holds the whole window
with a sonar animation for the same wait, and it keeps the wizard in the way of a person who
wants to look around. Grok's answer costs one pill.

The counter-argument for the takeover is that recompose has nothing to show behind it yet: the
canvas the person would fall into is the very thing screen 14 reveals. Both readings are
defensible, so it goes to gate 1 as an open question rather than a settled one. The cheap middle
is to keep the takeover but let `Skip setup` on 13 drop straight to the canvas with a Grok-style
pill in the toolbar, which the address pill already has room for.

### Resend, no webhook events yet

<https://mobbin.com/screens/e6c37cd6-6f44-4b5e-b954-6f65640893ec>

The passive version: an empty table with "No webhook events yet" and a line saying what will
fill it. Filed as the shape screen 13 must beat, not as a candidate.

## The pointing step, screen 12

### ElevenLabs, Adding an integration tool

<https://mobbin.com/flows/3711a040-02ee-445c-aceb-7db54d774043>

Not a layout reference. Filed because it shows the alternative recompose rejected: a dialog per
integration, one at a time. Screen 12's accordion puts every picked harness on one screen with
the first open, which is the cheaper read when a person picked several.

## What no reference answered

- No published screen shows a wizard that resolves into the product's own canvas the way screen
  14 does. Nothing to check it against.
- No reference carries a taught diagram like screen 09, where the product's real node cards
  stand in as an explanation. The nearest neighbours are marketing sections, not product
  screens, so the arm found nothing to file.
