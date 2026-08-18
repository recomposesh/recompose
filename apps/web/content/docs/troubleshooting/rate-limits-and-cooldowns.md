---
title: 'Rate limits and cooldowns'
description: 'What a 429 means through a router, and why cooldowns are deliberate.'
---

## What you'll see

With a single target behind the virtual model, the provider's own 429 passes through untouched, and its `Retry-After` is the provider's word.

With a router, a 429 moves the walk to the next child, so you only see an error when everyone refused. The aggregate refusal names each child and its reason:

```
The router "Fallback" in the gateway "My gateway" has no child left to try for the
virtual model "claude-fast": claude-sonnet-4-5 refused with 429, gpt-5.2 stands
cooling. Try again in 42 seconds.
```

It answers 429 with a `Retry-After` only when every child promised a retry time. Otherwise it answers 502 and promises nothing, because a promise nobody made isn't recompose's to invent.

## What the wait means

`Try again in 42 seconds.` is the latest promise among the children, passed along, not padded. Retrying earlier fails: the providers said so. Honor `Retry-After`, and back off exponentially where no promise exists.

## Cooldowns are deliberate

A child that refused stands down for 60 seconds before routing offers it again, or for exactly the window the provider named, when it named one. This is a feature: hammering a rate-limited account extends the limit. A cooldown ends by expiry or by restarting the gateway. A virtual model with a single target never cools: with nobody else to try, sitting out would only add silence.

Cooling has no chip and no cable color: it's named only inside the aggregate refusal. And while every child of a router stands cooling, refused requests never reach routing: no log row, no cable change. Expect a quiet drawer during a cooldown spell rather than reading it as a hang.

## Reading the drawer during a limited spell

The [request log](/docs/operate/request-log) writes one row per attempt, so a walk that tried three children leaves three rows, each with its own status. A 429 paints amber rather than red. The **Errors** filter collects the refused attempts.

## When to add capacity

A limit you hit daily isn't a retry problem. Add another account as a child of the router, or move traffic to [round-robin](/docs/compose/round-robin) when spreading beats sticking. That's the recompose version of upgrading the plan.

## Still stuck

Keep the full aggregate refusal body, then follow [Collect logs](/docs/troubleshooting/collect-logs).
