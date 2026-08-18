---
title: 'Routing semantics'
description: 'The normative rules: order, retries, cooldowns, and refusal bodies.'
---

This page states the rules the [Compose pages](/docs/compose/failover) narrate. Where the two disagree, trust this page.

## Order

A **failover** router offers the earliest declared child that can still serve. It holds no state: declared order is the whole instruction.

A **round-robin** router filters out children that can't serve right now, then offers them in turn. The turn pointer lives in the gateway's memory, per router, and never touches disk: a gateway or app restart resets it, at the cost of one uneven request.

Two limits bound a walk. Routers nest at most 4 deep, enforced when the graph saves. And one request attempts at most 8 children, each at most once.

## What moves the walk on

A child's answer moves the walk to the next child only when it's worth retrying elsewhere:

- Status 408, 429, 500, 502, 503, 504, or 529
- A transport failure: the target never answered at all
- A target with no account or no credential behind it

A provider that marks its own error retryable outranks the status. Everything else is an answer: the provider's own error body goes back to the caller as written, and no other child runs.

## Cooldowns

A child that moved the walk on cools down for 60 seconds before it stands in line again. A provider that named its own timing wins: `Retry-After` sets the wait, and Anthropic's rate-limit reset headers time the stand-down. Cooldowns clear by expiry or by restart, and a virtual model with a single target never cools: with nobody else to try, sitting out would only add silence.

## The commit rule

On a streamed answer, the first event commits the choice. The gateway holds the stream until the first event arrives, classifies it, and only then commits: an error event counts as a refusal and can move the walk on. After commit, the answer belongs to that child. A failure mid-stream reaches the client as a truncated stream, never as a silent retry against a second child. The client may have already acted on the first half.

A target gets 240 seconds to open its answer. Waiting it out reads: `The gateway "<name>" waited out its bound on the target "<model>" for the virtual model "<model>", and the answer never opened.`

## Refusal bodies

recompose's own refusals carry a type and render in the caller's dialect. In the Anthropic shape:

```json
{
  "type": "error",
  "error": { "type": "not_found_error", "message": "No model named \"gpt-fast\" is defined." }
}
```

| Status | Code                 | When                                                                                                                                     |
| ------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 404    | `model_not_found`    | `No model named "<model>" is defined.`                                                                                                   |
| 502    | `missing_credential` | `The virtual model "<model>" in the gateway "<name>" has no account behind it. Reconnect the account it spends, or point it at another.` |
| 502    | `empty_router`       | A router with no children                                                                                                                |
| 502    | `target_unreachable` | The lone target never answered                                                                                                           |
| 400    | `chained_turn`       | See below                                                                                                                                |
| 499    |                      | `The client disconnected before the request finished.`                                                                                   |

## When every child refuses

The walk ends with one aggregate refusal naming the router and every child tried, each with its reason: `refused with 429`, `could not be reached`, `stands cooling`, and so on. It answers 429 with a `Retry-After` and a trailing `Try again in <N> seconds.` only when every attempted child promised a retry time. Otherwise it answers 502 and promises nothing.

## Chained turns

A request that resumes server-side state, by `previous_response_id`, sealed reasoning, or a signed thinking block, can't rotate between accounts. The walk refuses at the first round-robin router it meets, at any depth, with status 400: `The router "<router>" in the gateway "<name>" spreads requests across accounts, so it cannot carry a turn that resumes server-side state for the virtual model "<model>". Switch this router to failover, or start a conversation that doesn't resume server-side state.`
