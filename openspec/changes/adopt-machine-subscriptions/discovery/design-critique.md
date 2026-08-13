# Design critique: adopt machine subscriptions

Read-only critique pass over the gate-1 proposal, per the standard-tier planning step. Findings enter the gate as input. This file records what the critique found, what the orchestrating session verified afterward, and what changed in the proposal because of it.

## Verified before acting

The critique raised two questions it could not answer alone. Both were settled by reading the code.

`subscriptions:restore` routes through the sign-in path. `subscriptions-ipc.ts:230` shows `restore` calling `signIn`, which reaches `makeRoomForTheSignIn` at line 47, which parks and then clears the plain keychain item. So finding 2 describes behavior that is live today, not behavior this change would introduce.

No recompose subscription home exists on the probe machine, so none of the five derived keychain entries could be traced back to a recompose sign-in. The service name is built at runtime rather than stored whole in the shipped binary, so the version boundary stays unsettled. The design answer does not depend on settling it, because probing both names is correct under either reading.

## Finding 1: the demoted sign-in destroys what the promoted act reads

Severity 1. Accepted, and it overturns the rider the proposal first filed.

`credential-custody.ts:5` names the plain service. `clear()` at line 106 removes that item, and `placeFrom` at line 78 overwrites it. `machine-probe.md` establishes that a recompose sign-in writes a derived name instead, so custody has been operating on the person's own Claude Code credential rather than on one recompose produced.

The session found the consequence to be worse than the critique stated. A sign-in does not merely blank the item. On success, custody _places_ a recompose account's credential into it. An adopted account reading through would then serve as the wrong account, silently, with no error anywhere.

The proposal filed the derived-name repair as a rider. That was wrong. It is a precondition, and the proposal now carries it as locked decision 7.

## Finding 2: the row offers the wrong remedy for an adopted account

Severity 1. Accepted.

`subscription-account-row.tsx:29` puts "Sign in again" in the overflow of every connected row, and lines 84 to 88 put it inline on a lapsed one. Both reach `restore`, which is the path above. An adopted account's remedy is never recompose signing in, and the spec delta already says a stale account names the tool to open.

The remedy now branches on where the account came from rather than on its standing.

## Finding 3: both acts land in the same sheet foot

Accepted.

`sheet.tsx:44` portals `SheetActionSlot` children into the sheet foot, which already holds Cancel from `catalog-flow.tsx:73`. `theme.css` carries exactly two button weights, at lines 235 and 484. Three acts and two weights leaves the demotion unreadable, and Cancel would sit at the same weight as the sign-in act.

The adopt act moves into the found-account row, trailing, which is what the Coda and Linear references actually do. The foot keeps Cancel and nothing else new.

## Finding 4: the two-section split does not fit its container

Accepted, and it replaces the design-system section of the proposal.

`catalog-flow.tsx:87` narrows the sheet for the connect step, `sheet.tsx:132` leaves 368 pixels, and `sign-in-way.tsx:34` draws a 320 pixel centered column inside that. The Coda pattern is a wide left-aligned page. Two headed sections, each holding one item, weigh more than what they organize.

The connect step keeps its settled anatomy: the picked identity at the head, a verdict slot that reserves its height, then the act. The found account becomes the answer inside that anatomy. Sign-in demotes to a quiet act beneath the primary rather than behind a heading. In a column this narrow a second choice is a link, not a section.

## Finding 5: three states collapse and one is stated twice

Accepted in full.

An absent tool and an empty machine state one fact twice, and `sign-in-way.tsx:41` already owns the absent-tool copy. The adoption section does not render at all when the tool is missing.

A refusal has no way back. `detect-runtime-step.tsx:117` already solved this in the same slice with a check-again act, and the delta gains a retry scenario.

Stale and lapsed would give a person two attention chips differing by a word they cannot act on. The delta only ever asked stale to read apart from _absent_. One attention word carries "not working", and the remedy button carries the difference.

A pending act disables the other path rather than hiding it, so the sheet does not resize under the cursor.

## Finding 6: nothing on screen says where an account came from

Accepted.

`subscriptions.ts:40` defines the view as a strict object with no provenance field, so the renderer cannot receive one until the schema changes. Provenance decides which remedy a row offers and whether recompose touches the credential, so a person who cannot see it cannot predict what the row does.

The view schema gains the field and the delta gains a scenario requiring the row to read it.

## Finding 7: what triggers the machine read was unspecified

Accepted, and it was the one blocking gap for gate 1.

The delta forbids detection on every visit to a surface, while requiring the answer to be on screen when a person arrives. `catalog-flow.tsx:89` remounts the step on every back-and-repick, and the neighboring tools query sets `refetchOnMount: 'always'`, which is the behavior locked decision 7 exists to avoid.

The read splits in two. Detection reports _that_ an account exists, with its address and plan, without returning credential material. Adoption returns the material, and only a person's click causes it. The detection query carries an explicit stale time and never refetches on mount.

## Finding 8: macOS rules around the system prompt

Accepted as constraints on the implementation.

No recompose alert in front of the system prompt; the explanation is static text read before the click. The sheet holds while a read is in flight, so an Escape aimed at the system prompt cannot close the sheet behind it. A denial never reads as an empty machine, and nothing re-asks automatically. If the adopt act becomes the default button, the committing keydown prevents its default, because an Enter that picks a provider in the grid has carried into a newly mounted step in this codebase before.

## Finding 9: the spec scenarios narrate the scan

Accepted. The house voice states the fact and the remedy in one sentence, in second person, with no first person plural. The delta's wording changes accordingly, and the reference file's quoted line gets a note so an implementer does not inherit a voice the house forbids.

`catalog-flow.tsx:30` describes the subscription kind as signing in with a plan you already pay for. That line goes stale when this lands and changes in the same branch.

## Finding 10: the primitive count was wrong

Accepted. The visual row shape exists, the component does not. `SubscriptionAccountRow` renders a list item bound to a connected account view and two mutations. The found-account row is a new component, so it takes its own folder and a stories sibling before the branch leaves the machine.

On tokens the critique agrees with the proposal, and none are added. The button-weight gap is named in the proposal rather than discovered during implementation.

## Not accepted

Nothing. Every finding either changed the proposal, the spec delta, or both.
