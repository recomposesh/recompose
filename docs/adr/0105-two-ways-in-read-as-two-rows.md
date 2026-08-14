# 0105: two ways into a plan read as two rows

**Status**: Accepted
**Date**: 2026-08-14

## Context

Record 0080 gave the subscription connect step two ways in. The machine already holds an account, so the step can record that one, and the provider's own tool can sign in as somebody else. Both reach the same end: one stored subscription.

The step ranked them. The found account stood in a card carrying a filled Connect button, and the sign-in dropped under it as an underlined link. The sheet's own foot held only Cancel, so the act that settles the sheet sat inside the body while the shelf built for it stood half empty. A person reading the step met a heading, three lines of terms, a card, a button inside the card, and a link, all centred in a column 320 pixels wide.

The same sheet asks a person for an address under the Custom endpoint and Custom aggregator entries. Its rows lay a label beside a control fixed at 288 pixels. The sheet leaves 340 pixels inside a field box, so `Base URL` had 42 pixels to read in and wrapped, which is what the shipped `flex-wrap` was already doing.

Mobbin shows the settled shape for both. Google, Proton, and Confluence all present accounts to choose from as rows of one list, each row pressable, with adding another account as the last row. Nothing in that pattern ranks one row over another.

## Decision

**A step offering two ways to one end offers them as two rows of one list.** The found account is the first row and the sign-in is the second. Each row is the whole act: the leading disc or glyph, the name, one quiet line saying how the thing stands or what pressing it does, and a chevron. Neither row carries a button, because a button inside one row ranks that way over the row beside it.

**The sheet's foot keeps only Cancel while a choice stands.** Nothing settles the sheet except picking a row, so the foot holds nothing that competes with the choice. An empty machine leaves one way in, and there the sign-in returns to the foot as the sheet's primary act.

**The head reads from what the machine answered.** A found account turns the step into a question of which account, so the head names the tool and asks. An empty machine has to read what spending this plan means before it signs in, so that head keeps the terms. The reading owns the head, which is why the head moved from the step into the branch that knows.

**A row names itself for a screen reader.** Two lines never spell the act between them, so the found row carries `Connect <account>` and the sign-in row carries its own sentence.

**A field whose value is longer than the room beside its label stacks.** The field box row takes a stacked layout. Every row of a form needing one takes it, so no form mixes the two shapes.

**A vendor mark that knocks its glyph out in white takes the ink around it instead.** Kimi is the one mark in the inventory drawn that way, and nothing stands behind the knockout, so its colored drawing disappeared into every light surface. Its outline drawing answers both variants.

## Alternatives

- **Keeping the card and moving its Connect to the sheet's foot**: rejected. The foot act would settle the sheet for the account the card names while the link beside it settles it for another, so one way would still outrank the other by position.
- **A radio list with a foot act**: rejected. It asks for two presses where the rows already answer in one, and neither way needs confirming before it runs.
- **Shrinking the control on the address rows so the label fits beside it**: rejected. It fits the label by making an address unreadable, which is the value that row exists to take.
- **Leaving Kimi colored and lightening the surface behind it**: rejected. It bends a surface token to one vendor's drawing, and the next such mark would bend it again.

## Consequences

**Good**: the choice reads in one glance at one weight, the sheet's foot means one thing everywhere, and an address stays readable under the hand typing it. The row component carries the shape, so the next step offering two ways in gets it for free.

**Bad**: the found account's act changed its accessible name, so the end-to-end helper that reaches for it now matches a prefix rather than the bare word. Kimi loses the blue dot its colored drawing carries, in both schemes, because one drawing now answers both. The head differs between a found account and an empty machine, so the step has two openings rather than one.
