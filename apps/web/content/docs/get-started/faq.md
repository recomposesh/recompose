---
title: 'FAQ'
icon: CircleHelp
description: 'Short answers to common questions about recompose.'
---

This page answers the questions that come up before the first install and after the first request. Each answer stays short and links onward: anything that needs steps has its own page.

## The project

### Is recompose free? [#free]

Yes. recompose costs nothing, has no paid tier, and asks for no account. The model capacity behind it isn't free: you still pay whichever providers you point it at.

### Is recompose open source? [#open-source]

Yes, under the MIT license. The source lives on [GitHub](https://github.com/recomposesh/recompose).

### Why does recompose exist? [#why]

Coding agents multiplied faster than the plans behind them. Each client wants its own provider setup, and a rate limit stops your work mid-task. recompose puts one local address in front of everything you already pay for, so a limit becomes a routing decision instead of a stop.

### What makes recompose different from hosted gateways and local proxies? [#different]

By where your traffic and your trust go. A hosted gateway terminates your requests on someone else's server and bills you through their account. A local CLI proxy runs on your machine but takes its configuration through files. recompose keeps the traffic local, keeps the billing relationship between you and each provider, and makes the wiring visible on a canvas.

## Your data

### Does traffic go through recompose servers? [#servers]

No, and no recompose server exists. Requests travel from your machine straight to the provider endpoints you configured. A provider or aggregator you choose remains a third party with its own policies.

### Does recompose collect telemetry or need an account? [#telemetry]

No telemetry leaves the machine, and no account exists to create. recompose does write local records: a request log and a usage ledger under `~/.recompose`. [Data on disk](/docs/operate/data-on-disk) lists every file.

### Where do credentials live? [#credentials]

In `~/.recompose`, with API keys in an encrypted vault that the interface never reads back. Subscriptions stay with the provider's own tool: recompose never signs in on a provider's behalf. [How recompose works](/docs/get-started/how-recompose-works) covers the trust model.

## Providers and limits

### Does routing a subscription through recompose break the provider's terms? [#tos]

The provider's terms are the authority, so read them for the plan in question. On the wire, recompose spends a subscription through the provider's own tool: that tool signs in, and requests leave in that tool's own shape. Judging what a plan allows stays with the account holder, and so does the risk.

### Does recompose add latency? [#latency]

One hop on your own machine, in front of the same provider call the client would make anyway. A model answer takes from half a second to many seconds, so the hop sits below that noise floor. recompose publishes no overhead number it hasn't measured.

### Can a provider change break recompose? [#provider-changes]

Yes. Subscriptions ride each provider's own wire format, and providers change endpoints, headers, and model catalogs without notice. A broken path surfaces as a typed refusal rather than silence, and fixes arrive through normal updates.

### Does recompose work without a subscription? [#keys-only]

Yes. API keys, aggregators, and local runtimes all wire into the same gateway. Mix them or run one alone: [Providers](/docs/providers) covers all four account kinds.

### Which platforms does recompose run on? [#platforms]

macOS 12 Monterey or later, 64-bit Windows 10 or later, and any modern 64-bit Linux. [Installation](/docs/get-started/install) carries the per-platform paths.
