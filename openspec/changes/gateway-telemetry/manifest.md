---
tier: standard
phase: discovery
approvals: []
branch: worktree-gateway-telemetry
---

# Gateway telemetry

The gateway detail screen gains its live-traffic surfaces: a status footer under the canvas and a logs drawer that opens on a footer click. The footer aggregates the running gateway's traffic on its left side and tallies the composition on its right. The traffic side reads requests per minute, p95 latency, the error count, the client count, tokens per minute, and cost. The tally side counts nodes and wires. The drawer streams request log rows under filter chips for all rows, errors, and each virtual model. Every row carries the request time, the method, the virtual model, the resolved provider model, the provider, the account, the status code, and the duration. The maintainer confirmed the `standard` tier on 2026-08-10.

Three maintainer decisions seed the discovery. The footer matches the reference screenshots: aggregates on the left, composition tally on the right, and the idle state reads zeros. Clicking the footer opens the logs drawer over the lower canvas. The drawer scopes its rows to the canvas selection. The gateway shows everything, a virtual model shows the requests that passed through it, and a target shows the requests that reached it. User-facing copy keeps naming the alias a virtual model, never a bare model.
