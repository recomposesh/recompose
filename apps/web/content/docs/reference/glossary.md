---
title: 'Glossary'
description: 'The words recompose uses, each with the page that owns it.'
---

## Account

One connected way to spend a provider, of one of four kinds: subscription, API key, aggregator, or local runtime. The canvas calls a bound account a target. See [Four kinds of accounts](/docs/providers).

## Adopted account

A subscription recompose found on the machine, signed in by the provider's own tool, and connected without a new sign-in. It stays the tool's own, and recompose never renews it. See [Subscriptions](/docs/providers/subscriptions).

## Aggregator

An account whose one key reaches a whole hosted catalog of models. See [Aggregators](/docs/providers/aggregators).

## Bind address

The app-wide address gateways listen on, `127.0.0.1` unless you widen it. See [Serving other devices](/docs/operate/serving-other-devices).

## Cable

The line on the canvas that binds two nodes: a virtual model to a target or router, a router to its children. Its color carries the last request's standing. See [The canvas](/docs/compose/canvas).

## Config home

The folder holding everything recompose stores, `~/.recompose` by default. See [Data on disk](/docs/operate/data-on-disk).

## Cooldown

A failed child's stand-down from routing, 60 seconds unless the provider named its own timing. See [Routing semantics](/docs/reference/routing-semantics).

## Dialect

One of the five wire formats a gateway speaks: Anthropic Messages, OpenAI Chat Completions, OpenAI Responses, Gemini, and Interactions. See [Dialect translation](/docs/reference/dialect-translation).

## Failover

The router mode that offers children in declared order and moves on only when one refuses. See [Failover routing](/docs/compose/failover).

## Gateway

One local HTTP server with its own port, serving your virtual models at the root of its address. See [Gateways](/docs/compose/gateways).

## Ghost target

A target whose account left the registry. The binding holds so you can repair it with a cable gesture rather than rebuild it. See [The canvas](/docs/compose/canvas).

## Inspector

The panel beside the canvas that shows and edits whatever you select. See [The canvas](/docs/compose/canvas).

## Local runtime

A model server on this machine, connected by port and observed rather than trusted. See [Local runtimes](/docs/providers/local-runtimes).

## Price miss

A model the price map couldn't name, counted by requests instead of shown as zero dollars. See [Usage and spend](/docs/operate/usage-and-spend).

## Refusal

A typed error recompose itself raises, rendered in the caller's dialect. A provider's own error isn't a refusal and passes through as written. See [Routing semantics](/docs/reference/routing-semantics).

## Round-robin

The router mode that takes turns across children that can serve right now. See [Round-robin routing](/docs/compose/round-robin).

## Router

A routing node holding one mode and an ordered list of children, which may be targets or further routers. See [Chaining routers](/docs/compose/chaining-routers).

## Stand-in key

The literal `unused`: what connect snippets carry where a gateway checks no key, because clients demand a value. See [Securing a gateway](/docs/operate/securing-a-gateway).

## Subscription

An account behind a plan you sign in to, spent through the provider's own wire. See [Subscriptions](/docs/providers/subscriptions).

## Target

An account bound to a virtual model together with the provider model it serves. See [The canvas](/docs/compose/canvas).

## Vault

The encrypted file holding provider keys, locked by the OS to this user on this machine. See [Data on disk](/docs/operate/data-on-disk).

## Virtual model

A model name you define. Clients ask for it, and the routing behind it decides who answers. See [Virtual models](/docs/compose/virtual-models).
