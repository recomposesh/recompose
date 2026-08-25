## Rider-ledger discovery: openspec/changes/onboarding-wizard (tier full)

**Result: lookup succeeded, open rider ledger is empty. No prior out-of-scope rider carries into this feature.**

### Command and result

```
gh issue list --repo recomposesh/recompose --label rider --state open --limit 200 --json number,title,body
→ []   (exit 0)
```

This is an empty ledger, not a lookup failure. Three checks separate the two:

1. **The label exists.** `gh label list --repo recomposesh/recompose` returns `rider — "Out-of-scope discovery parked from a fix cycle; read by the discovery phase"` (`#D4C5F9`). A missing label makes `gh issue list` fail rather than return `[]`.
2. **The query path reaches real data.** The same command with `--state all` returns 41 rider issues, every one `CLOSED` (highest #322 "Context menus want an end-to-end layer"; lowest #90 "Flow green drifts from the locked value in light mode").
3. **The whole open backlog is two issues, neither a rider.** `gh issue list --repo recomposesh/recompose --state open --limit 100 --json number,title,labels` returns only #263 "Add desktop E2E coverage for guarded-request telemetry" and #7 "Dependency Dashboard", both with an empty `labels` array.

Repository confirmed as `recomposesh/recompose`, public, via `gh repo view --json nameWithOwner,isPrivate`.

### Ledger

**Empty.** No open issue carries the rider label, so there was no body text to judge against the feature, and no issue number to name.

### What the ledger was judged against

- `openspec/changes/onboarding-wizard/manifest.md` — tier full, phase discovery, branch `worktree-onboarding-wizard`, `isUI: true`, and the affected-subsystem line: onboarding (new), settings, gateways, virtual-models, routers, subscriptions, api-keys, aggregators, local-runtimes, gateway-canvas, engine.
- `openspec/changes/onboarding-wizard/specs/onboarding/spec.md` — two ADDED requirements. First: the wizard opens on a first session only, finish and dismiss record the same standing, the app menu reopens it, and the opening step is derived from what the profile already holds rather than from stored progress. Second: the wizard treats a gateway-recorded served request, never a stored credential, as the finish signal, and a refused request leaves it waiting.

### Non-binding context, outside the ledger

Four closed riders name subsystems the manifest lists. None is an open rider, so none belongs in the ledger; flagged only so the caller can decide whether to revisit the underlying question during design: #108 "Home is a blank dotted surface when the remembered gateway has gone" (gateway-canvas first-run surface), #123 "subscriptions:activate stands without a surface since the menu prune" (subscriptions), #117 "A virtual model never offers a subscription target" (virtual-models, subscriptions), #244 "Gateway rename has no canvas affordance" (gateways).

### Gaps

- **No code map in this response.** This arm was scoped to the rider ledger, so renderer files, exported symbols, and their Feature-Sliced Design layers were not enumerated. If the caller needs the code map for the subsystems the manifest names, that is a separate dispatch.
- **Closed-rider bodies unread.** The `--state all` query pulled `number,title,state` only, so the four titles above rest on titles alone. No claim is made about whether their content was resolved or merely closed.
