---
title: 'Live traffic'
description: 'What the canvas shows while requests move.'
---

The canvas is the live view: cables carry the standing of their last request, and the footer under the canvas aggregates the last minute. No separate traffic pane exists.

## What a cable tells you

A cable holds one of three standings, taken from the newest request that crossed it:

- **In flight**: a dot travels the cable for as long as a request is underway. This is the only animation, and it disappears under the system's reduced-motion setting.
- **Served**: the cable tints green when a request lands, then cools back to its resting color after 60 seconds of quiet.
- **Failed**: the cable tints red and stays red until newer traffic answers it. A chip labeled **Last error** rides the cable and opens a popover with the status, such as `Status 429`, and a sentence about the failure.

The failure sentence is either the target's own words, quoted up to 280 characters, or recompose's status sentence. Two examples: `The target refused the credential.` and `The target is turning requests away for now.` Two endings settle without a provider verdict: a client that hangs up mid-request paints 499 with `The client disconnected before the request finished.`, and stopping the gateway paints 503 with `The gateway stopped before the request finished.`

One request can paint two cables: on a failover router, the child that refused turns red and the child that answered turns green, at once.

## The footer

The strip under the canvas rolls up the last 60 seconds: requests per minute, latency, distinct client apps, tokens per minute, and an error count that only appears above zero. The right edge counts the canvas itself, as `3 nodes · 2 wires`. Everything on the footer is display only, and idle gateways show zeros rather than hiding the strip.

No money appears on the footer or in the [request log](/docs/operate/request-log). Cost estimates live on the [Usage](/docs/operate/usage-and-spend) page alone.

## Live view against the log

The cables answer what's happening right now, then let it go by design. The request log answers what happened, one row per request, back through the last 10,000. When a red cable makes you ask why, the log's **Errors** filter is the next stop.
