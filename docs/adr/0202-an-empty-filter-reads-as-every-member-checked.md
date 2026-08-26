# 0202: An empty filter reads as every member checked

**Status**: Accepted
**Date**: 2026-08-26

## Context

Each filter on the usage screen carries the members it keeps, and an empty list means the view keeps
everything. The address, the buckets, and the trigger all read that empty list the same way. A
person who has narrowed nothing sees "All" on the trigger rather than a count.

The menu drew the opposite. Every row sat blank while the filter kept every member, so the picture
said none while the trigger said all. "Select all" made it worse: it cleared the selection, which is
the model's word for everything, and every row went blank as it fired. The button looked like a
clear, and pressed from an untouched menu it changed nothing a person could see.

The rows answered to the blank picture too. Picking one row while the filter stood on everything
narrowed onto that member alone. A person reading four checked rows and clearing one asked for
everything except that member, and got the one member they had cleared.

## Decision

**A filter standing on everything reads as every member checked.** The empty list is what the model
carries, and the menu now draws what it means. A row that reads checked reports checked to a screen
reader, because the drawn state and the accessible state are one state.

**Empty stays the only representation of everything.** A selection that grows to cover every member
collapses back to empty rather than standing as a full list. Two spellings of everything would leave
the trigger, the address, and the bucket filter each guessing which one they hold.

**Picking a row while the filter stands on everything lets that member go.** The filter keeps every
other member, which is what the four checked rows promised. A window that served one member is the
exception: letting that member go stands the filter back on everything. A view of nothing has no
representation here, and it would read as an empty screen with no way back.

**"Select all" reaches every member the window served, never the ones the search lists.** A search
narrows what a person can see, and it never narrows what an act means. The rows follow the same
rule: they toggle against every member, so the selection a person narrows keeps a member the search
hides rather than dropping it.

## Consequences

The trigger and the footer keep their words and stay honest: "All" and "All N selected" while the
filter stands on everything, "N of M" once it narrows.

Pressing "Select all" while the filter already stands on everything does nothing, which is the
truthful outcome rather than the reported defect. The act that used to hide behind the button,
clearing every row, was never reachable in this model and no longer looks reachable either.

A member the window never served but the address still names counts among everything. Completing the
list from such a selection collapses to empty in the same way.

The rule lives in one place, `pages/usage/lib/filter-picks.ts`, as two pure functions over the kept
list. The menu renders them, and no caller under `pages/usage` carries a second copy of the meaning.
