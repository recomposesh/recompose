---
title: 'Usage and spend'
description: 'Served history in tokens, with spend as an estimate on top.'
---

The Usage page aggregates every served request across gateways and providers. One thing to hold before any number: **Spend is an estimate from public list prices, never a bill.** Token counts are what providers reported. The dollar figures are recompose's arithmetic on top, and your provider's invoice is the authority.

Open it from the sidebar under **System → Usage**, or with Cmd+3. Rows elsewhere in the app deep-link here pre-filtered: a provider row's `{N} requests in the last 24 hours →` line lands on this page scoped to that account.

## The tiles

Five tiles lead the page: **Requests** with the change against the previous window, **Errors** as a share of requests, **Latency** as an average, **Tokens** with the cached share, and **Spend**. An empty tile shows `—`, and a sub-cent spend shows `<$0.01`.

## How recompose computes spend

Prices come from the public LiteLLM price map. recompose ships a bundled snapshot, refreshes it daily from GitHub, and caches the refresh at `~/.recompose/prices.json`. It computes estimates at answer time and never stores them, so a price correction reprices your whole history on the next read.

Spend splits by account kind and the two halves never merge:

- **API keys and aggregators**: a billed estimate, from the tokens the provider reported at list price.
- **Subscriptions**: an equivalent, prefixed `≈`, saying what the traffic would have cost at list price. Your plan already paid for it.
- **Local runtimes**: no cost, ever.

A model the price map doesn't know accrues no spend and surfaces as a price miss with its request count, rather than pretending zero cost is a fact.

## Why it won't match your bill

List prices ignore your negotiated rates, credits, and rounding. The map prices cached tokens its own way, which may differ from your provider's discount. And subscription traffic never appears on a bill at all. Treat Spend as a compass, not an accountant.

## Windows and filters

Presets cover `1h`, `24h`, `7d`, and `30d`, and a custom popover draws any range. Filters narrow to chosen gateways and providers, and the chart stacks by gateway, virtual model, provider, or account. The one holdout has its reason printed beside the control: `Latency is averaged, so it never stacks`. The chart's caption names the bucket width, and a marked edge shows where kept history begins.

Retention is a setting: 7, 30, or 90 days, with 30 the default. A preset outside retention goes inert with the reason, `Usage retention holds 7 days`. Token history accrues to `~/.recompose/usage.json` in hour buckets and survives restarts.

## When the page is quiet

Before the first request, the page says `No requests yet` with `Send a request through a gateway and it collects here.` A quiet window offers one recovery act, either **Clear the filters** or **Widen to 24 hours** and its siblings.
