---
tier: full
phase: implementation
approvals: ['design', 'tasks']
branch: worktree-gateway-canvas
---

# Gateway canvas

The second composition slice turns the gateway detail screen into a node canvas with cable management. The gateway appears as a node, with virtual models and targets as nodes beside it. A person wires them by dragging a cable between ports, the way Excalidraw draws an arrow. The maintainer confirmed the `full` tier on 2026-08-08 and asked for a thorough interactive brainstorm on the interaction design before anything freezes.

Two decisions recorded on 2026-08-06 seed the discovery. The gateway node draws an automatic wire ending in a plus affordance instead of presenting a bare canvas. User-facing copy names the alias a virtual model, never a bare model. The visual reference lives in the Claude Design project under `templates/gateway/index.html`.

Gate 1 closed on 2026-08-08. The maintainer approved the design document after the design-critic findings folded in, freezing fourteen locked decisions in `discovery/brainstorm-decisions.md` and the amended proposal. Gherkin and the solution design open next, toward gate 2.

Gate 2 closed on 2026-08-09. The maintainer approved the scenario set and the solution design together. Thirty-six scenarios across eight feature files froze under `gherkin/gateway-canvas/`, beside the seventeen-section design and the Architecture Decision Record (ADR) 0084. Implementation opens next, behind the sync step.
