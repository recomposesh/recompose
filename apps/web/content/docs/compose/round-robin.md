---
title: 'Round-robin routing'
description: 'Spread requests across children in turn.'
---

## What it does

A round-robin router alternates across the children that can serve, one request to the next child in turn. The app's own words: requests alternate across the children, this spreads the load, and each switch costs a prompt cache hit.

## Wire one

1. Create a router the same way as a [failover](/docs/compose/failover): every canvas-born router starts as failover.
2. In the router's inspector, switch **Routing mode** to **Round-robin**. The children stay exactly as they were.
3. The **Children** list shows no order controls, on purpose: nothing reads an order here, so no affordance pretends one matters.

The drawer's draft flow also asks the mode up front, when you compose the model and its router in one sitting.

## What happens on a refusal

Children cooling down after a rate limit leave the rotation before the turn picks, and they rejoin when the cooldown ends. A retryable refusal moves on to another child. A refusal about the request itself goes straight back to the caller, and the first byte of an answer commits the choice.

## When every child refuses

The caller gets one typed refusal naming the router and every child tried, each with its reason. [Routing semantics](/docs/reference/routing-semantics) carries the statuses and the timing rules.

## When to use it

Round-robin earns its place when one account's limits are the bottleneck and you hold several that can share the work.

> A round-robin router refuses conversations that resume server-side state, because the next turn could land on a different account than the one holding the state. The refusal says so and names the remedy: switch the router to failover, or start a conversation that doesn't resume server-side state.
