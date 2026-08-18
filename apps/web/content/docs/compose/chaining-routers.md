---
title: 'Chaining routers'
description: 'Routers as children of routers.'
---

## What chaining means

A router's child is a target or another router, so routing composes. Every node answers to exactly one parent, and a chain runs at most four routers deep.

## How a request walks a chain

1. The request reaches the entry router, which picks a child by its mode.
2. A picked target gets the attempt. A picked router picks again, one level down.
3. A subtree counts as able to serve when any target under it can, so the walk skips a nested router whose children all cool down rather than asking it.
4. A refusal that can move on climbs back up, and the parent offers its next child.

Each target still gets at most one attempt per request, wherever it stands in the chain.

## The depth limit

Four routers deep is the ceiling, and recompose enforces it when it stores the composition. Honesty about the rough edge: the refusal a fifth nest gets is the generic one about not being able to store the virtual model, not a message naming the depth.

## Two shapes worth knowing

**Failover of round-robins** keeps pools in an order and spreads load inside each: try this pool, and only when the whole pool fails, the next. Order the pools, and let each one alternate inside.

**Round-robin of failovers** spreads across accounts while each account keeps its own ordered fallback behind it.

## What chaining doesn't change

The first byte that reaches the caller commits the choice, wherever the chain found it. And when everything refuses, the caller gets one refusal from the entry router naming every target tried in declared order, whatever order the walk actually took. [Routing semantics](/docs/reference/routing-semantics) carries the details.
