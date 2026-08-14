# Mobbin references

Session-run discovery arm. The hero is already designed and prototyped, so this pass covers the
two surfaces that have no drawing yet: the landing sections under the hero, and the
documentation shell.

## Landing: the section that explains the gateway

recompose has to explain a three step idea on the page: connect an account, compose a virtual
model, point a client at the local gateway. Four references, ranked by fit.

### Clay, How it works

<https://mobbin.com/sites/sections/28c16d19-1b1c-4c38-b06e-660c77901cbc>

Four cards in a row. Each carries a bracketed ordinal `[1]`, a short all caps label, and two
lines of body. No illustration anywhere, and a single "Get started" button sits directly under
the heading rather than repeating per card.

Take: the ordinal treatment and the discipline of two lines per step. This is the cheapest
version of the section that still reads as a sequence, and it costs no artwork. It is the
fallback if the illustrated version below runs out of budget.

### Browserbase, Zero setup. Real results.

<https://mobbin.com/sites/sections/687d0833-191b-4fba-8963-368492c97a10>

Three numbered steps, each with its own illustration above the text. The middle panel is
literally a "Model Gateway" hub with a provider ring around it, which is the closest published
drawing to what recompose does.

Take: the three panel rhythm, and the confirmation that a gateway reads visually as a hub with
providers around it. The recompose canvas already draws that hub, so the section can crop the
real product rather than commissioning art.

### Intercom, Smarter routing and lead qualification

<https://mobbin.com/sites/sections/c10c2255-1f2f-4f97-9a34-0831fb8a5a93>

Text on the left, routing diagram on the right, a small mark above the heading, and a quiet
"Learn more" link instead of a button. The diagram is a decision tree with labeled branches.

Take: the asymmetric pairing for a single deep idea, and the restraint of a text link over a
second button. recompose has exactly one routing story to tell this way.

### Customer.io, Onboard, activate, and convert

<https://mobbin.com/sites/sections/67ad80ed-b97a-44ac-ac41-d32de16e487d>

The same pairing mirrored, diagram left and text right, with inline links inside the body copy
carrying the reader deeper.

Take: alternating the side across consecutive sections keeps a page of pairings from reading as
a list.

## Documentation shell

### Mintlify

<https://mobbin.com/screens/13bb73b1-bb01-43e0-800f-05f03cfc6bfa>

Three columns: a grouped sidebar tree on the left, article in the middle, "On this page" anchors
on the right. Guides and API reference sit as tabs above the tree. Steps are numbered in the
margin, each code block carries a copy control, and a prerequisites callout opens the page.

Take: this is the shape Fumadocs ships by default, which is the argument for not fighting the
default. The details worth copying deliberately are the numbered margin steps and the
prerequisites callout, both of which the install page needs.

### Cloudflare, AI Gateway

<https://mobbin.com/screens/f9e55e3d-7097-491f-8136-58312d972c25>

A gateway product documenting itself. The code example sits under a row of inline selectors that
read as a sentence: make a request via one thing, to another, using cURL.

Take: this control maps onto recompose exactly. A reader wants the same request shown against a
virtual model in the Anthropic dialect and in the OpenAI dialect, and a selector row says that
better than two stacked blocks. It is the one documentation pattern here that recompose should
copy on purpose rather than inherit.

### OpenAI Platform

<https://mobbin.com/screens/1b39571a-c929-4ba6-934c-9786fc50681d>

The documentation landing page is a card grid under a "Start building" heading, with the grouped
tree still in the sidebar, and a row of destination links at the foot.

Take: the documentation root should be a grid of tasks, not the first article in the tree. A
reader arriving from the landing page has a goal, and a card grid lets them name it.

## What this pass did not find

No reference showed a marketing hero that reveals its scene under the pointer. The hero has no
prior art in this library, which is a point in its favor and a reason to treat its behavior
specification as the only source of truth for it.
