---
tier: standard
phase: implementation
approvals: ['design', 'tasks']
branch: worktree-gateway-telemetry
---

# Gateway telemetry

The gateway detail screen gains its live-traffic surfaces: a status footer under the canvas and a logs drawer that opens on a footer click. The footer aggregates the running gateway's traffic on its left side and tallies the composition on its right. The traffic side reads requests per minute, p95 latency, the error count, the client count, tokens per minute, and cost. The tally side counts nodes and wires. The drawer streams request log rows under filter chips for all rows, errors, and each virtual model. Every row carries the request time, the method, the virtual model, the resolved provider model, the provider, the account, the status code, and the duration. The maintainer confirmed the `standard` tier on 2026-08-10.

Gate 1 closed on 2026-08-10 after two revisions. The design-critic returned seventeen findings on the first revision, and the maintainer returned reject with notes plus four gate decisions. The critique lands in full. The footer stays passive text with a discrete disclosure control. The scope selectors draw as a segmented control beside the independent errors chip, and per-role kicker-safe ink tokens enter the theme from a sibling branch. The maintainer approved the second revision, freezing the design document. Gherkin and the solution design open next, toward gate 2.

Gate 2 closed on 2026-08-10. The maintainer approved the scenario set and the solution design together. Forty-seven scenarios across eight feature files froze under `gherkin/gateway-telemetry/`, beside the seventeen-section design, the realigned spec delta, and Architecture Decision Record (ADR) 0086. Implementation opens next, behind the sync step.

Three maintainer decisions seed the discovery. The footer matches the reference screenshots: aggregates on the left, composition tally on the right, and the idle state reads zeros. Clicking the footer opens the logs drawer over the lower canvas. The drawer scopes its rows to the canvas selection. The gateway shows everything, a virtual model shows the requests that passed through it, and a target shows the requests that reached it. User-facing copy keeps naming the alias a virtual model, never a bare model.
