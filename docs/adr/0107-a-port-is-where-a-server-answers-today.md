# 0107: A port is where a server answers today

**Status**: Accepted
**Date**: 2026-08-14

## Context

A stored local runtime kept its address write-once. Moving `OLLAMA_HOST` to another port meant removing the row and adding it again, and the refusal on the second add said as much: "Ollama is already connected. Remove the row to point it at another port."

That reads as a workaround because it's one. Removing the row throws away the name a person gave a server nobody documents, along with the id anything else points at.

## Decision

A stored runtime moves in place, through `accounts:move-runtime`, which takes the row's id and a port.

The act sits in the row's overflow menu beside Check again and Remove, and opens a dialog holding one field, prefilled with the port the row answers at now.

The request carries a port rather than an address. Main mints the address the way an add mints it, so no stored row can name anything but this machine.

A move onto an address another server already holds refuses in the same words a second add refuses in. A documented runtime moving onto its own port doesn't collide with itself.

## Alternatives

- **An edit path through the detect step**: rejected. That step's job is discovery, and it would grow a second mode to serve what's a small edit to a number a person already knows.
- **An editable address on the row**: rejected. The host isn't the person's to set, and a free-text address invites one that isn't loopback.
- **Leaving remove-and-add as the way**: rejected. It loses the row's name and its id, which is a real cost for a changed number.
- **Naming the new address in the request**: rejected. Every other path mints the address in main, and taking one from the renderer would leave this the only place a stored row's host came from outside.

## Consequences

**Good**: a moved server keeps its row, its name, and everything pointed at it. The conflict rule needed no new logic, because the same `alreadyStanding` shape answers a move correctly: a documented runtime collides by identity and a custom one by address.

**Bad**: the row carries three acts behind its overflow rather than two, which is the most any row on this screen holds. A fourth would want rethinking rather than adding.

The move drops the row's standing chip rather than asking again, so a moved row reads as unchecked until something looks. That's deliberate. What the old address answered says nothing about the new one, and a row that kept its chip through a move would claim otherwise.
