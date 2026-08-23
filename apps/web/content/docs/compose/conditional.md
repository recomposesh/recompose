---
title: 'Conditional routing'
description: 'A judge names the branch that answers.'
---

## What it does

A conditional router sends each request to the child best suited to answer it. Every branch pairs a short label with a rule written in plain language, and a judge, a small model bound like any target, reads the request against those rules. The app's own words: a judge reads each request and names the branch it belongs to, and anything it can't place lands on the else branch.

## Wire one

1. Choose **Conditional** in the drawer when you compose the virtual model: the draft flow asks the mode up front. An existing router can't switch into conditional, because the stored policy names a judge and an else branch that a mode switch can't supply.
2. Bind the judge: an account plus a provider model. Fast, cheap models judge best, because the judge only names a branch and every request waits on its answer.
3. Give every branch a label and a rule. The **Branch rule** sheet holds both, along with a **Routes to** line naming the child. The label is the exact word the judge answers with, so a rename changes what it reads.

A permanent else branch completes the router. It holds every request the judge reads and places on no branch of its own.

## How the judge decides

The router spends one classification per request. The judge hears the branch labels, the rules, and what the caller has said, then answers with one label. Beside those labels the judge always gets one more word, `none`, for a request that fits no branch at all, and that answer lands on else without a second ask. An answer wearing neither a label nor `none` earns exactly one more ask, and a second miss lands on else too. The judge itself never receives the request it classified.

A judge that reaches no verdict refuses the request rather than routing it. Three things read that way: a refusal from the judge, an answer that outwaits its three-second budget, and a judge standing cool after a rate limit. The virtual model then answers `503` and names the trouble. Else is where a judge sends a request it has read, never where the router drops one it never read.

## A conversation keeps its branch

A conversation keeps the branch it first earned, so its prompt cache survives every turn. The gateway recognizes a conversation by the turns the caller has spoken, whichever request shape carried them. The conversation keeps only a branch the judge actually named. A request that fell to else asks the judge fresh next time, so one bad minute from a judge never parks a whole conversation on the fallback.

The **Re-judge every request** toggle opts out: every request goes back to the judge. A conversation can then change branch on the way, and each change costs a prompt cache hit. The toggle reaches every turn, including one that resumes state a provider holds for a single account. Leave it off and such a turn keeps the branch it earned, which matters because clients that replay signed reasoning send one on every turn after the first.

## What happens on a refusal

A retryable refusal from the judged branch moves the walk to else, never back to the judge, and a branch already cooling sends the request straight to else. The other branches stay out of it: a request judged onto one branch never wanders to another. A refusal about the request itself goes straight back to the caller as the provider wrote it, and the first byte that reaches the client commits the choice.

## When every child refuses

The caller gets one typed refusal naming the router and every child tried, each with its reason. [Routing semantics](/docs/reference/routing-semantics) carries the statuses and the timing rules.

## When to use it

Conditional earns its place when different requests deserve different models. Send deep reasoning to the strongest subscription, everyday chat to a cheap pool, and code review to the model that reads diffs best. A branch child can be another [router](/docs/compose/chaining-routers), so the branch a judge picks can hold its own failover behind it.
