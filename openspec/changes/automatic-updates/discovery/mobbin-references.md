# Mobbin references

Arm: Mobbin references. Run in the orchestrating session, because the Mobbin tools live there and
`researcher` cannot reach them.

Two searches ran on the web platform: one for a new-version banner carrying a restart action, one
for a persistent badge that is not a modal. The split matters, because the spec forbids the modal
shape and the first search returned mostly modals.

## The closest match to what the spec asks for

[Patreon](https://mobbin.com/screens/4d91a4e6-19a7-4482-b3fc-29ae06f2d1f4) carries a standing strip
across the top of the working area: a quiet dot, the sentence "You have unpublished changes.", and
two buttons pinned right, "Discard" and "Save and publish". Nothing is dimmed behind it, the page
stays usable, and the strip states a condition rather than demanding a decision.

That is the shape this feature needs. Read across to the update case: a dot, "Version 0.4.0 is ready
to install.", and one button that restarts. The strip persists because the condition persists, and
it clears when the condition clears rather than when someone dismisses it.

Two details worth stealing. The buttons sit at the far right, so the sentence reads first and the
action lands where a person's eye finishes. And the destructive-looking option ("Discard") gets the
quiet treatment while the forward action gets the solid fill, which maps onto "later" against
"restart now".

## What the settings side looks like

[Twenty](https://mobbin.com/screens/07d13b73-c275-4a0d-a675-ed90207aa178) gives "Updates" its own
row in the settings sidebar under an "Other" group, and the pane holds a "Releases" section with a
single "Read changelog" row. Sparse on purpose.

[Clerk](https://mobbin.com/screens/0d334b51-f362-45b1-a6a5-6c2cb42abac3) runs the same idea with
state on it: an "Updates" settings row, and the pane leads with the count, "1 new update available",
then the release notes underneath with a status chip.

[n8n](https://mobbin.com/screens/022472df-146d-4420-8982-73040a6f36b8) names both versions at once:
"You're on 1.112.3, which released 5 days ago and is 1 version behind", with the newer version
listed below and its release date beside it. Naming the installed version alongside the waiting one
answers the question a person actually has.

## The anti-pattern this feature must avoid

Five of the eight results from the first search were centered modals over a dimmed page:
[Relume](https://mobbin.com/screens/c232da70-62b0-4b60-9ebf-12c5aa8c9232),
[Suno](https://mobbin.com/screens/c624149f-83c2-484b-b079-7ad7593613f9),
[Quicken](https://mobbin.com/screens/c9908794-a4c6-46aa-93cf-bb23e9432b72),
[beehiiv](https://mobbin.com/screens/67b4162b-dbc1-440b-83bc-01ca0e98f145) and
[Sora](https://mobbin.com/screens/f7573f33-f7e6-4929-8fe7-06d0749fdf6a).

Every one of them stops the person to announce something. They are "what's new" announcements rather
than update prompts, but the shape is the trap: the spec says the app opens no window and no dialog
when a download finishes, and the modal is what that clause rules out. Sora goes furthest and offers
"Stay on old Sora" against "Enter invite code", which turns an announcement into a decision the
person did not ask to make.

## What this arm hands to the brainstorm

- The affordance is a standing strip or an inline chip, never a modal.
- It names the waiting version, and naming the installed version beside it costs one line and
  answers the obvious question.
- One forward action, restarting, gets the solid treatment. Deferring needs no button, because
  ignoring the strip already defers it.
- Settings can hold a fuller "Updates" pane later. Nothing in the spec requires one now, so it stays
  a rider rather than scope.

## Second pass, for the three canvas alternatives (2026-08-17)

Two more searches ran while the affordance alternatives were drawn in `designs/recompose.pen`: one
for a slim persistent bar with one action, one for a sidebar-bottom standing chip.

- [Ditto](https://mobbin.com/screens/5aafba83-ed0f-45d7-b603-f448fbbfd7c7) runs a slim full-width
  top banner with the sentence left and the action right, the working-area strip shape at its
  thinnest.
- [Plane](https://mobbin.com/screens/acb49906-5e78-45fc-b820-75354c74c2e0) parks a quiet standing
  pill at the sidebar's bottom edge ("Business trial ends in 13d"), state that persists without
  asking for attention.
- [incident.io](https://mobbin.com/screens/9618b478-1dc4-428c-b34d-5f4115112f4d) does the same with
  a small bottom-left sidebar card, one step louder than Plane's pill.
- [n8n](https://mobbin.com/screens/022472df-146d-4420-8982-73040a6f36b8) (already cited above)
  names the installed and waiting versions together, which the strip alternative borrows.

A first round drew a toolbar strip, a quiet sidebar chip and a toolbar pill from these references.
The maintainer rejected all three as too quiet and asked for a livelier card under the Get started
panel, which sent a third search after colorful sidebar-bottom cards.

## Third pass, for the card under Get started (2026-08-17)

- [Mercor](https://mobbin.com/screens/6611a860-409f-4439-a0b7-446671bff304) shows the violet
  gradient hero card whose weight the rejected gradient alternative borrowed.
- [Portrait](https://mobbin.com/screens/e1c84d34-9b06-4511-8d8a-f8a4a913e0b7) accents a white
  surface with a gradient tile and a gradient-outlined action, the shape the chosen card follows.
- [Langdock](https://mobbin.com/screens/fe015a4f-7142-45d9-a899-4a724d011d0e) parks its standing
  offer at the sidebar's bottom edge under the Get started block, the placement the maintainer
  chose.

Three cards ran on the canvas, each with and without the Get started panel above it: a full
gradient card, a white card with a gradient icon tile, and a dark card with a gradient border. The
maintainer picked the white card ("halo") first, then walked its tile through the brand blue and
the app icon's own indigo, and rejected both readings: identical blues on the tile and the button
read monotone, and the icon's indigo read foreign, since nothing else in the product carries it.
Three token-only treatments (blue tile with a quiet button, a status dot, a mono tile) read too
plain, which sent a fourth search after livelier shapes.

## Fourth pass, the treatment that won (2026-08-17)

- [Whop](https://mobbin.com/screens/e0427b3e-f282-4261-b13a-bf0dcdd0c52e) floats a bold number pill
  on a soft diagonal color beam, the rejected "version beam" alternative.
- [Emergent](https://mobbin.com/screens/13d06728-b1a4-49ff-846d-4f02d878b1ad) frames its panel in a
  soft aurora glow, and [Semrush](https://mobbin.com/screens/e6e8c8d0-cf78-4303-beb5-3552e09d77b2)
  tops a white body with a decorated header zone and sparkles. Together they shaped the winner.
- A third alternative spoke the product's own canvas language, a cable from a `0.3.0` node to a
  `0.4.0` node; the maintainer passed on it in favor of the aurora.

The maintainer chose the **aurora header** card, then flattened it into the product's own idiom:
the radial glow became a flat wash, and the shadows on the card and its tile became the hairline
borders the rest of the app draws (`#00000017` on light, `#ffffff16` on dark). What stands in
`designs/recompose.pen`, on the four `Update card halo · …` frames (light and dark, with the Get
started panel and alone): a header zone washed flat in the scheme's own blue (`#0064d2` on light,
`#3d9bff` on dark) with two small sparkles, a hairline-bordered white tile with a blue up arrow,
then a centered "Update ready" over "0.3.0 → 0.4.0", and one full-width "Restart to update" button
in the primary blue. Every color is a value the product already uses, stepped only in alpha.
