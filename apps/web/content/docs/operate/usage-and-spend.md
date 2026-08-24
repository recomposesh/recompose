---
title: 'Usage and spend'
description: 'Served history in tokens, with spend as an estimate on top.'
---

The Usage page aggregates every served request across gateways and providers. One thing to hold before any number: **Spend is an estimate from public list prices, never a bill.** Token counts are what providers reported. The dollar figures are recompose's arithmetic on top, and your provider's invoice is the authority.

Open it from the sidebar under **System → Usage**, or with Cmd+3. Rows elsewhere in the app deep-link here pre-filtered: a provider row's `{N} requests in the last 24 hours →` line lands on this page scoped to that account.

## The tiles

Five tiles lead the page: **Requests** with the change against the previous window, **Errors** as a share of requests, **Latency** as an average, **Tokens** with the cached share, and **Spend**. An empty tile shows `—`, and a sub-cent spend shows `<$0.01`.

## Plan usage limits

Under the tiles, one card per signed-in subscription account reads how much of that plan has gone,
across a **Current session** window and a **Current week** window. A plan you haven't sent
through yet keeps its card and says `No traffic yet`, so the strip never changes shape as accounts
wake up.

Where the provider reports a figure for its own plan, the card prints it as `23% used` over a filled
bar. Beneath it sits the reset the provider named. A session counts down to its hour, as
`Resets at 3:44 PM`, and a week names its day, as `Resets Wed at 3:00 PM`. Claude and Codex both
report on the answers recompose was already making, so the figure costs no extra request. It stays
as fresh as your traffic.

Where the provider reports nothing, the card falls back on this machine's own logs. It prints what
went through, as `329.4k sent`, and marks the inferred close with a tilde, as `Resets at ~3:44 PM`.
The bar is a dashed rail rather than a fill. Nobody has said where that window ends, and a fill
would read as a share of a limit no one measured. Gemini and Kimi report nothing at all, so their
cards stay in this form.

The two readings answer different questions. A provider's share covers everything that plan served,
including traffic from your other devices and from the provider's own apps. The `sent` figure covers
only what this machine sent.

## Credits

Under the plan cards, an account whose provider publishes a balance carries a **Credits** card. It
prints the remaining figure, the two totals behind it, and how long ago somebody read it.
**Refresh credits** takes a new reading for every card at once.

recompose holds a reading on disk for 90 days, matching the history the charts above it reach, so a
restart opens on the last figure rather than a blank card. The card always prints the reading's age,
so a restored figure never poses as a fresh one.

A provider that refuses the read says why on the card rather than printing a zero. OpenRouter reads
credits only with a management key, and the key an account serves requests with is an inference key.
So an OpenRouter account takes a second, optional key that only ever reads. The connect step asks
for it, and an account already connected takes one through **Add credits key** on its row. That key
never serves a request, and forgetting it takes its own act on the same row.

## How recompose computes spend

Prices come from the public LiteLLM price map, beside the models.dev registry for the one gateway that map never names, [OpenCode Zen](/docs/providers/aggregators). recompose ships a bundled snapshot of each, refreshes them daily, and caches both at `~/.recompose/prices.json`. One source being unreachable leaves the other refreshing. It computes estimates at answer time and never stores them, so a price correction reprices your whole history on the next read.

Where a gateway resells a model under its maker's name, the gateway's own rate is the one used. An OpenAI model served through OpenCode Zen prices at Zen's rate, not OpenAI's own.

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
