---
title: 'How recompose works'
icon: Workflow
description: 'The mental model behind gateways, virtual models, routers, and targets.'
---

recompose turns the model providers you already pay for into local gateways that any client can call. This page follows one request from a client to a provider and back, and defines each piece as the request reaches it.

## One endpoint, many clients

Every coding client wants the same thing: a base URL and a model name. recompose gives each client one local address, such as `http://127.0.0.1:8397`, and answers in the dialect the client already speaks. A gateway serves the Anthropic, OpenAI, and Gemini dialects at once, and the request path decides which one applies. Claude Code and Cursor can share one gateway without either noticing the other.

Pointing a client at a gateway is one setting: the [Connect a client](/docs/connect) pages carry the exact steps.

## The pieces a request crosses

A **gateway** is a local HTTP server that recompose runs for you. Each gateway owns its own port and serves at the root of its own address, with no path segment. It starts serving the moment you create it.

A **virtual model** is the name a client sends as the model, such as `claude-fast`. The name is yours to choose, and it's the only thing the client ever knows. What stands behind the name can change at any time without touching the client again.

A **router** decides where a virtual model's traffic goes when more than one option stands behind it. Two modes exist. Failover tries children in your declared order. Round-robin hands each request to the next child in turn. Routers nest, so a failover of round-robins is a normal wiring.

A **target** is one stored account bound to one real provider model, for example your Anthropic key bound to `claude-sonnet-4-5`. The request leaves for the provider with the target's real model name and credential.

An **account** is how recompose holds a provider. Four kinds exist: a subscription the provider's own tool signed into, an API key, an aggregator such as OpenRouter, or a local runtime such as Ollama.

## The canvas is the authority

The node canvas isn't a picture of the configuration: it's the configuration. What a gateway serves is exactly what stands wired on its canvas, and nothing else decides. No second config surface exists to drift from the drawing.

The trade-off is deliberate. Configuration lives in watched documents under `~/.recompose`, so an outside edit reaches a running gateway, but the canvas remains the one place that shows the truth.

## What happens to a request

1. A client sends a request with `model: claude-fast` to the gateway's address.
2. The gateway resolves the name to its routing and walks it: failover takes the first child that can answer, round-robin takes the next in turn, and a child cooling down after a rate limit gets skipped.
3. The winning target forwards the request to the provider with the real model name and the account's credential, translated into the provider's dialect.
4. The first byte that reaches the client commits the choice: no second target starts behind a stream already underway.

Failure stays typed and honest. An undefined model name answers `404`. A defined model whose backing can't answer returns `502` with a refusal naming every child tried and why. Nothing falls back on its own, and nothing leaves the machine when the answer is no.

## Where your credentials live

Everything lives in `~/.recompose`: gateway documents, settings, usage history, and an encrypted vault for keys. Settings has a **Config folder** row that reveals it in your file manager, so the claim is checkable.

API keys stay in the vault and never reach the app's interface again after you paste them. Subscriptions work differently: recompose never signs in on a provider's behalf. The provider's own tool signs in, and recompose either adopts the credential that tool holds or waits while it signs in again.

The only traffic that leaves your machine is the requests you route to providers. recompose asks for no account and sends no telemetry. Gateways bind to `127.0.0.1` unless you open them up, and each gateway can [require a key](/docs/operate/securing-a-gateway) from its callers. The [request log](/docs/operate/request-log) shows every request a gateway answers, and the [source](https://github.com/recomposesh/recompose) is open for the rest.

## Where to go next

- [Quickstart](/docs/get-started/quickstart): stand a gateway up in five minutes.
- [Compose](/docs/compose/canvas): the canvas, routers, and recipes in depth.
- [Providers](/docs/providers): every account kind and how each connects.
- [Routing semantics](/docs/reference/routing-semantics): retries, cooldowns, and refusals, precisely.
