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
