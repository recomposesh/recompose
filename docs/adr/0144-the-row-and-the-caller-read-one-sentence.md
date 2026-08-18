# 0144: The row and the caller read one sentence

**Status**: Accepted
**Date**: 2026-08-18

## Context

The log drawer lists one row per request a gateway answered. Two producers wrote those rows. An upstream attempt wrote one when it reached a provider. The gateway wrote one itself when no attempt ever stood for the request. Both read their sentence from a small table keyed by status. So a row for a virtual model with no account behind it read the generic sentence for a target the gateway couldn't reach. The client holding that same answer read a different sentence, one naming the model and the repair. Nothing told a person the two described one request.

Four rejections reached a caller and no reader at all. Both guards answer before the gateway chooses a route. The serving turn that keys every row opened after them. Four rejections sat behind that order: a refused credential, a caller outside the loopback set, a request carrying an Origin header, and a path nobody serves. Each left the machine with no row, no cable, and no trace.

Two more stayed invisible for a different reason. A request refused while every child stands cooling settles before the walk asks any child for a grant. So does a request whose target the table already stands unbound. The watcher that raises rows treated a spent grant as proof the request was worth reporting, and neither of these spends one.

A cable could stand annotated with no row beside it. A walk that moves on paints the child it left behind. Where nothing answered for that child, no attempt existed to write its row. The canvas counted two children and the drawer counted one.

Two docstrings had gone stale under all this. `requestOutcomeSchema` promised that a failure carried "a sentence written from that status alone, so no prompt and no provider answer can ride along." The quoting in `outcomeOf` superseded that promise 97 minutes later, in the same pull request. `logRowSchema` then derived its own rule from the superseded one.

## Decision

**A row the gateway raises reads the sentence the caller got.** The serving turn remembers that sentence at the one seam where a refusal becomes a response. The row reads it back. Where the gateway wrote no sentence of its own, the status reading stands as before.

**The turn remembers only sentences the gateway composed.** This keeps a row truthful and private at once. A target's own words reach a cable, where the person who owns the gateway presses them. They never reach a row, which a footer counts and a reader exports in bulk. The unreadable-request row keeps its status reading on purpose, because the refusal it would otherwise borrow names a JSON key the request itself carried.

**The serving turn opens ahead of both guards.** A rejection raised at the edge now keys and logs like any other answer. It costs a guarded request nothing else, because a turn becomes traffic only once a virtual model asks for a grant, and no guard reaches that far. Every edge rejection crosses one seam that answers the caller and writes the row together. Neither can happen without the other.

**A turn that named a virtual model settles even where it spent no child.** Naming the model separates two failures. A request the gateway couldn't place is one a person can fix, and it earns a row. A caller naming a model that doesn't exist earns none, because nothing ever stood for it. Cables don't change: no child carried the request, so no cable reads it.

**Whatever annotates a cable has a row beside it.** A child a provider refused already stands as the row that attempt wrote. A child nothing answered for has none, so the gateway writes it. Both surfaces then agree on how many children one request touched.

**A rejection body wears the caller's dialect wherever the gateway knows it.** A caller that reached a Gemini path named its dialect by arriving there. The drawing and filming routes carry OpenAI's paths, and they now answer OpenAI's envelope whole rather than a shortened one of their own.

## Alternatives

- **Read the raised row's sentence from the response body the caller received.** Rejected: that body holds the right sentence only while the gateway wrote it. A provider answer that raised no row of its own would push a provider's prose into a row through the same code. Remembering only what the gateway composed makes the privacy rule hold by construction rather than by luck.
- **Keep the guards ahead of the serving turn and let them write their own row.** Rejected: the client key is a digest taken at the edge and nowhere else. A second producer would either copy that rule or key its rows unlike every other row.
- **Give every rejection a row, a model nobody defined included.** Rejected for now: a caller naming a model that doesn't exist asks about nothing the gateway holds, and a spec already pins it as reaching no reader. The line drawn here is whether a virtual model ever stood for the request, which is the line a person can act on.
- **Restate the status-alone promise and drop the quoting.** Rejected: the quoting is deliberate. Its own commit names it, and specs cover it down to the 280-character bound, including why a person pressing a red cable wants the target's own words. The docstrings were wrong, not the behavior.

## Consequences

**Good**: a rejection a client sees is a rejection a person can find. A row and the answer a client holds can't disagree about why a request failed. The canvas and the drawer report the same children per request. The privacy rule now sits where it holds, once for a cable and once for a row, rather than one inheriting a claim the other had already broken.

**Bad**: a gateway that turns callers away in volume writes rows for it, so a misconfigured client can fill the drawer with 401s where it used to fill nothing. One walked ladder no longer means one row, which is the point, but any reader assuming one row per request has to stop. The serving turn carries one more field. The rule that a turn naming a virtual model reached a route table lives in a docstring, because no type can hold it.
