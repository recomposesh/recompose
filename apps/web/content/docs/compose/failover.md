---
title: 'Failover routing'
description: 'Children answer in declared order.'
---

## What it does

A failover router offers its children in the order you declared and hands the request to the first child that can answer. Each child gets at most one attempt per request. The app's own words: the topmost healthy provider answers, and each child below it stands in only when everything above it fails.

## Wire one

1. Drag a cable from a virtual model's port onto empty canvas and choose **Router**. A canvas-born router always starts as failover.
2. Drag cables from the router's port to each provider it picks among. New children join at the bottom.
3. Order the children in the router's inspector: the **Children** list moves rows up and down, and the spoken rank confirms each move.

The router's name is yours: an unnamed router answers to `Failover`, on the card, in the inspector, and in the refusals a client reads.

## What happens on a refusal

A retryable refusal, such as a rate limit or a provider outage, moves the walk to the next child. The refused child cools down before it stands in line again. A refusal about the request itself goes straight back to the caller as the provider wrote it: the next child would refuse it the same way. The first byte that reaches the client commits the choice, and no other child starts.

## When every child refuses

The caller gets one typed refusal naming the router and every child tried, each with its reason. It promises a retry time only when every child promised one. [Routing semantics](/docs/reference/routing-semantics) carries the statuses and the timing rules.

## When to use it

Failover is the default for a reason: it keeps traffic on one provider while that provider answers, which preserves prompt caches and keeps behavior predictable. Reach for [round-robin](/docs/compose/round-robin) only when spreading load matters more than either.
