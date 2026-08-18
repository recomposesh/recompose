---
title: 'Routing recipes'
description: 'Proven wirings for common needs.'
---

Five wirings that come up again and again. Each names the problem, the wiring, and what to know before adapting it.

## Survive your subscription's limit

**Problem:** you want your plan to do the work, and a rate limit shouldn't stop your work mid-task.

**Solution:** a [failover](/docs/compose/failover) router with the subscription first and an API key of the same provider under it. The subscription answers until it cools down, the key carries the overflow, and traffic returns to the subscription when its window opens.

**Discussion:** overflow on the key costs money per request, and [usage](/docs/operate/usage-and-spend) keeps the two spends apart.

## Pool two accounts behind one name

**Problem:** you hold two accounts of one provider and one alone bottlenecks.

**Solution:** a [round-robin](/docs/compose/round-robin) router with a target per account. Requests alternate, and a cooling account leaves the rotation until its window opens.

**Discussion:** each switch costs a prompt cache hit, and conversations that resume server-side state refuse under round-robin. Clients that carry their own context are the fit here.

## A local model as the last resort

**Problem:** when every paid provider is down or cooling, something should still answer.

**Solution:** a failover router with the paid targets on top and a [local runtime](/docs/providers/local-runtimes) such as Ollama at the bottom. The local model only speaks when nothing above it can.

**Discussion:** expect a quality drop when the chain bottoms out. Local traffic carries no cost in usage.

## One cheap name, one smart name

**Problem:** your client should choose between a fast cheap model and a strong slow one.

**Solution:** no router at all. Compose two virtual models on the same gateway, for example `claude-fast` and `claude-deep`, each bound to its own target. The client switches by model name.

**Discussion:** names are the interface: a client asking for `claude-deep` today can land on a different provider tomorrow without touching the client.

## Spread across accounts, keep a fallback in each

**Problem:** several accounts should share the load, and each should fall back to its own overflow key.

**Solution:** a round-robin router whose children are [failover](/docs/compose/failover) routers, one per account, each holding the subscription over its key. Two levels deep, well inside the [chain limit](/docs/compose/chaining-routers).

**Discussion:** the rotation skips a whole rung only when everything inside it cools. The round-robin caveat about server-side state applies at the top.
