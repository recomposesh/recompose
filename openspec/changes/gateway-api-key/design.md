# Solution design

## Header and change linkage

- Change id: gateway-api-key
- Schema: recompose
- Proposal: [proposal.md](proposal.md)
- Specs: [specs/engine/spec.md](specs/engine/spec.md), [specs/gateways/spec.md](specs/gateways/spec.md)
- Discovery: [discovery/code-map.md](discovery/code-map.md)
- Tasks: [tasks.md](tasks.md)

## Context

A gateway's listener asks two questions before it serves. Did the request arrive on this machine, and
does it carry an `Origin` header. `guardLoopback` in `packages/engine/src/loopback-guard.ts` holds
both. Neither asks who the caller is. Any process on the machine spends whatever accounts the gateway
fronts, and so does any host on the network once a person sets `bindAddress`.

This design gives one gateway an optional credential of its own. The gateway document stores it. The
snapshot a start directive already sends carries it into the engine. A second middleware beside the
loopback guard checks it. The box that already edits the gateway's name offers it.

## Discovery inputs consumed

- `packages/engine/src/gateway-app.ts:256`: fixed where the guard mounts, after `guardLoopback` and
  before `openServingTurn`, so a refused request never opens a serving turn or reaches the traffic
  ledger.
- `packages/engine/src/loopback-guard.ts`: fixed the guard's shape, a factory closing over gateway
  facts and returning a `MiddlewareHandler`.
- `apps/desktop/src/main/engine-host/stored-gateway.ts:58`: fixed how an optional field travels. The
  spread stays conditional, so `exactOptionalPropertyTypes` never meets an explicit undefined.
- `apps/desktop/src/main/storage/gateway-watcher-wiring.ts:17`: removed one task and added another. An
  edit already reaches the listener, so nothing new has to signal it. The same line also starts a
  stopped gateway, which decision 9 repairs.
- `apps/desktop/src/main/ipc/gateway-storage-ipc.ts:76`: fixed where the repair belongs. The rewrite
  path already holds `restartIfServing`, so the gap lives in the watcher path alone.
- `apps/desktop/src/main/ipc/engine-ipc.ts:74`: fenced the repair. `movePort` restarts a gateway that
  stopped on a port conflict on purpose, so the guard can't sit in `EngineHost.restart`.
- `apps/desktop/src/renderer/src/shared/api/gateways.ts:49`: removed a task. `gateways:update`
  carries a whole `GatewayConfig`, so the key needs no channel.
- `apps/desktop/src/renderer/src/shared/ui/copy-button/copy-button.tsx`: removed a task. The renderer
  copies through `navigator.clipboard`, so this change needs no main-process copy channel. Under
  Architecture Decision Record (ADR) 0047 the plaintext never reached the renderer at all, which is
  why that feature needed one.
- `docs/adr/0062-a-schema-version-names-one-shape.md`: forced the version bump to 3.
- `docs/adr/0047-gateway-token-vault-and-clipboard.md`: supplied the mint shape, the mask shape, and
  the no-reveal decision. It's also the record this design departs from on storage.
- `packages/engine/src/gateway-session.ts:96`: consulted, no impact. Inbound credentials already
  reach the logs as a SHA-256 fingerprint, so no log path changes.

## Goals and non-goals

**Goals:**

- A gateway holds an optional API key, and requiring none keeps today's behavior exactly.
- Every path but health refuses a request that arrives without a required key.
- A person turns the key on, copies it, regenerates it, and turns it off, from the gateway's General
  Info.
- Turning the requirement off keeps the stored key.
- A gateway document written before this change reads back untouched.
- A document change reaches a serving gateway and leaves a stopped one stopped.

**Non-goals:**

- No app-wide key. The app-wide one went away on purpose, and this design leaves it there.
- No per-client key, no key with a scope, no key with an expiry, and no key list per gateway.
- No key on an outbound provider call. That credential belongs to the account and answers a different
  question.
- No transport security. The listener stays plain HTTP, which ADR 0047 already recorded as a stated
  deviation from Request for Comments (RFC) 6750.
- No rotation reminder, and no expiry.

## Constraints and invariants

- TypeScript at maximum strictness: `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
  `noPropertyAccessFromIndexSignature`. No `any`, no `as` cast to silence an error, no `@ts-ignore`.
- Never write a code comment. The `@summary` docstring on an exported declaration counts as
  application programming interface documentation rather than a comment.
- Never disable, override, loosen, or silence any gate.
- Test-first, inside-out, state-based. Test code changes if and only if behavior changes.
- Feature-Sliced Design v2.1 governs anything in the renderer. A component under a `ui/` segment owns
  a folder and ships its `*.stories.tsx` sibling.
- Never use an em dash in authored prose.
- Domain language: `gateway`, `virtualModel`, `target`, `provider`, `account`.

## Design

Four layers, each holding one responsibility.

**The contract owns the value.** A new module in `packages/contracts` holds the field's schema, the
mint, the mask, and the pure rewrite that puts a key on a config or takes one off. Both processes and
the renderer import from there, so the shape of the value has one authority.

The mint reads 32 bytes from `globalThis.crypto.getRandomValues`. It spells them as unpadded
base64url behind the `rc-local-` prefix ADR 0047 fixed. Web Crypto is a global in Node 24 and in
Chromium. The contract therefore stays free of `node:crypto`, and the renderer mints without a
channel.

**The engine owns the check.** A second middleware mounts after `guardLoopback` and before
`openServingTurn`, and only when the snapshot carries a key. It exempts the two health paths. Then it
collects every candidate the request presents and passes when any one of them matches.

```
request
  -> guardLoopback        loopback interface? no Origin header?
  -> guardApiKey          health path? -> serve
                          any presented candidate matches? -> serve
                          otherwise -> 401
  -> openServingTurn      the traffic ledger opens here, so a 401 never counts as served traffic
  -> route
```

The comparison reduces both sides to a keyed SHA-256 tag and calls `timingSafeEqual`. Tagging first
keeps the two buffers at 32 bytes whatever the inputs were. The compare therefore leaks neither the
key's length nor how many leading characters a guess got right.

A secret each guard mints at start keys that tag rather than leaving it bare. Nobody can compute the
tag of a guess offline. A bare digest also reads to a scanner as a password hash carrying no work
factor. That's what it would be, if the value were a password rather than a 256-bit random token.

An absent key and a wrong key draw the same 401 with the same body. Splitting them would tell a
caller whether a gateway holds a key at all, and it buys a person nothing the status code hasn't
already said.

**The main process owns delivery.** `engineGatewayOf` copies the key onto the snapshot where the
document requires it, the way it already copies `bindAddress`. Most of what follows runs on existing
machinery. The config hash covers the new field, and a restart sends the fresh snapshot. The one piece
that changes is the watcher's upsert, which reapplies to a serving gateway rather than restarting
whatever it finds.

**The renderer owns the act.** The maintainer picked option B from `designs/recompose.pen`. The key gets
an Access section of its own between General Info and Endpoint, rather than a row inside the box that
edits the name.

The section holds three things. A heading carrying a `Switch`. A field box holding the masked key beside
a `CopyButton`, above a regenerate row. One line naming the fields a client can present the key in.

The switch and the regeneration apply the moment a person acts, which is what `Switch` already documents
about itself, so the section holds no draft and no save button. Regenerating goes through
`ConsequenceDialog` first, because it invalidates a credential the person already handed to their
clients.

Each act writes a whole `GatewayConfig` through the `gateways:update` mutation the drawer already uses,
built by `withGatewayApiKey`.

## Data model and contracts

`GatewayConfig` gains one optional field carrying both facts together:

```ts
apiKey: z.strictObject({ value: nonBlankString, required: z.boolean() }).optional();
```

Three states, and no fourth. An absent field means the gateway never minted a key. A field with
`required: false` means a stored key the gateway doesn't enforce. A field with `required: true` means
the gateway enforces it. Two independent fields would admit a fourth state, a requirement with no key
behind it, and every reader would have to decide what that meant.

`GATEWAY_CONFIG_VERSION` moves from 2 to 3, with an identity migration from 2. The bump exists for
the downgrade path. A build that predates the field parses a version 2 document carrying `apiKey`
against a `z.strictObject`, fails on `unrecognized_keys`, and quarantines the gateway. At version 3
that build meets `GatewayNewerSchemaError` instead and leaves the file alone. ADR 0062 recorded this
defect, and the bump is the remedy that record prescribes.

`EngineGateway` gains `apiKey?: string`, carried on the start directive's snapshot. The engine learns
the key only where the gateway enforces it. Main resolves the requirement and omits the field
otherwise, so the child holds no secret it has no use for, and the guard needs no second flag.

This change adds, alters, and removes no Inter-Process Communication (IPC) channel. `gateways:update`
already carries a whole `GatewayConfig`.

## Error handling

| State                                                                   | Typed result                                                                      | Where it surfaces                    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| Request carries no candidate                                            | 401 `AnthropicRefusal` of type `authentication_error`, `WWW-Authenticate: Bearer` | The client that sent it              |
| Request carries only missing candidates                                 | The same 401, byte for byte                                                       | The client that sent it              |
| Stored document carries a blank key                                     | `z.ZodError` from `nonBlankString`, reaching the existing quarantine path         | The existing corrupt-document notice |
| An older build reads a document carrying `apiKey` at version 2 or lower | `GatewayNewerSchemaError`                                                         | The existing newer-schema notice     |

No new failure reaches the renderer. Minting can't fail. `getRandomValues` throws only on a request
above 65536 bytes, and this one asks for 32.

## File map

- `packages/contracts/src/gateway-api-key.ts`: the prefix, the schema, `mintGatewayApiKey`, and
  `maskGatewayApiKey` (create)
- `packages/contracts/src/gateway-api-key.test.ts`: the mint shape, the mask, and the rewrite
  (create)
- `packages/contracts/src/gateway-api-key.property.test.ts`: the mask laws under fast-check (create)
- `packages/contracts/src/gateway-config.ts`: the field, the version bump, the migration,
  `withGatewayApiKey`, and `enforcedApiKey` (modify)
- `packages/contracts/src/gateway-config-migration.test.ts`: a version 2 document reads at 3 (modify)
- `packages/contracts/src/gateway-config.test-d.ts`: the field stays optional on the derived type
  (modify)
- `packages/contracts/src/engine-protocol.ts`: `apiKey` on `engineGatewaySchema` (modify)
- `packages/contracts/src/index.ts`: the barrel entry (modify)
- `packages/engine/src/api-key-guard.ts`: the middleware, the candidate collection, the constant-time
  compare (create)
- `packages/engine/src/api-key-guard.test.ts`: the guard's behaviors (create)
- `packages/engine/src/refusals.ts`: `apiKeyRequired` beside the two loopback refusals (modify)
- `packages/engine/src/gateway-app.ts`: mounts the guard (modify)
- `packages/engine/src/gateway-app-api-key.test.ts`: the guard through a built app, health open, a
  management path closed (create)
- `apps/desktop/src/main/engine-host/stored-gateway.ts`: carries the field onto the snapshot (modify)
- `apps/desktop/src/main/engine-host/stored-gateway.test.ts`: the snapshot carries it, and omits it
  when the document holds none or holds one it doesn't enforce (modify)
- `apps/desktop/src/main/engine-host/gateway-lifecycle-requests.ts`: `reapply` joins `restart` and
  skips a gateway whose state isn't `running` (modify)
- `apps/desktop/src/main/engine-host/gateway-lifecycle.testkit.ts`: the recording engine, which now
  reports which gateways serve (create)
- `apps/desktop/src/main/engine-host/gateway-lifecycle-requests.test.ts`: reads its seams from the
  testkit (modify)
- `apps/desktop/src/main/engine-host/gateway-lifecycle-reapply.test.ts`: a serving gateway reapplies, a
  stopped one stays stopped, and a restart a person picked still acts (create)
- `apps/desktop/src/main/storage/gateway-watcher-wiring.ts`: calls `reapply` on an upsert (modify)
- `apps/desktop/src/main/storage/storage-watchers.ts`: threads the renamed request (modify)
- `apps/desktop/src/main/boot/stored-boot.ts`: threads the renamed request (modify)
- `apps/desktop/src/main/index.ts`: threads the renamed request (modify)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-access/gateway-access.tsx`: the
  Access section, in the page layer's `ui/` segment beside `gateway-general-info` (create)
- `.../gateway-access/gateway-access.stories.tsx`: off, on, and the regeneration question (create)
- `.../gateway-access/gateway-access.browser.test.tsx`: the section's behaviors (create)
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/subject-bodies/subject-bodies.tsx`: mounts the
  section between General Info and Endpoint (modify)
- `apps/desktop/e2e/features/engine/api-key.feature`: what a gateway holding a key answers, graduated
  unchanged from `gherkin/engine/` (create)
- `apps/desktop/e2e/steps/engine-api-key.steps.ts`: its steps (create)
- `apps/desktop/e2e/features/gateways/api-key.feature`: the act in the drawer, graduated unchanged
  from `gherkin/gateways/` (create)
- `apps/desktop/e2e/steps/gateways-api-key.steps.ts`: its steps (create)
- `docs/adr/0106-a-gateway-carries-its-own-key.md`: the record (create)
- `cspell-words.txt`: any new vocabulary the diff introduces (modify, only where needed)

## Interfaces

**`packages/contracts/src/gateway-api-key.ts`**

- Consumes: `nonBlankString`, `globalThis.crypto.getRandomValues`, `btoa`
- Produces:
  - `const GATEWAY_API_KEY_PREFIX: 'rc-local-'`
  - `const gatewayApiKeySchema: z.ZodType<{ value: string; required: boolean }>`
  - `type GatewayApiKey = { value: string; required: boolean }`
  - `function mintGatewayApiKey(): string`
  - `function maskGatewayApiKey(key: string): string`

**`packages/contracts/src/gateway-config.ts`**

The two rewrites live beside the document they rewrite rather than beside the key, which is also what
keeps the dependency one-way. `gateway-config` reads the key schema, and the key module reads nothing
back, so the no-circular rule holds. `settings.ts` already carries `withSettingsPatch` the same way.

- Produces:
  - `function withGatewayApiKey(config: GatewayConfig, apiKey: GatewayApiKey | undefined): GatewayConfig`
  - `function enforcedApiKey(config: GatewayConfig): string | undefined`, the one authority on whether
    a stored gateway enforces its key, read by `engineGatewayOf` on the way to the snapshot

**`packages/engine/src/api-key-guard.ts`**

- Consumes: `MiddlewareHandler` from hono, `createHash` and `timingSafeEqual` from `node:crypto`,
  `apiKeyRequired` from `./refusals`
- Produces: `function guardApiKey(displayName: string, apiKey: string): MiddlewareHandler`

**`packages/engine/src/refusals.ts`**

- Produces: `function apiKeyRequired(displayName: string): AnthropicRefusal`

**`.../ui/gateway-access/gateway-access.tsx`**

- Consumes: `maskGatewayApiKey`, `mintGatewayApiKey`, `withGatewayApiKey`, `sectionHeading`, `factRow`,
  `CopyButton`, `Switch`, `ConsequenceDialog`, `useDefineVirtualModel`
- Produces:
  ```ts
  type GatewayAccessProps = { gateway: GatewayConfig };
  function GatewayAccess(props: GatewayAccessProps): ReactNode;
  ```
- The component reads the stored gateway and writes the whole config back, so it holds no draft. Its
  only local state is whether the regeneration question stands open.

## Decisions

### 1. The key lives in the gateway document rather than the vault

The maintainer settled this at the tier gate. ADR 0047 put the retired app-wide token in the vault
under a fixed reference, and closed by declaring that shape the precedent for every later
secret-bearing feature. This change departs from it.

The vault would buy encryption at rest through `safeStorage`. On a machine with no keyring that call
falls back to plain text anyway. The vault would charge five things: a per-gateway reference scheme,
a mint channel, a status channel, a copy channel, and a deletion path tied to gateway removal. It
would also charge a second delivery path carrying the plaintext into the engine child beside the
snapshot. The document already travels to the child and to the renderer, so the key rides existing
wires at no cost.

This design states the exposure it accepts rather than hiding it. The key sits in plain text in the
user data folder, so anything that reads that folder reads the key. That covers a backup, a sync
client, and any other process running as the same person. The value guards a local listener, and two
clicks replace it. That's the trade.

**Alternatives considered:** the vault under a per-gateway reference, rejected above on cost against
what it buys on a machine that may hold no keyring. The vault with the digest alone in the document,
rejected because the guard needs no plaintext but the copy control does, which puts the read back
where it started.

**ADR draft:** `docs/adr/0106-a-gateway-carries-its-own-key.md`

### 2. The stored version moves to 3

ADR 0062 takes a version number drifting from the shape it names as its whole subject. The concrete
damage it recorded is a strict parse quarantining a document over an unrecognized key. Adding
`apiKey` at version 2 reproduces that exactly for anyone who downgrades.

**Alternatives considered:** keeping version 2 on the argument that the field stays optional,
rejected because optional describes the new reader and says nothing about the old one. Loosening
`gatewayConfigSchema` off `z.strictObject`, rejected outright, because it would silence the guard
that catches the next typo.

### 3. The app mints, and the schema accepts any non-blank value

A person who invents a credential invents a weak one, so the only path the screen offers is a mint.
The stored field stays `nonBlankString`. A hand-edited document reads back rather than costing a
person their gateway, and so does one carrying a key they brought from CLIProxyAPI.

**Alternatives considered:** a schema pinned to the minted shape, rejected because it turns a hand
edit into a quarantined gateway. A typed field with a length floor, rejected for the same reason at a
lower threshold.

### 4. Four accepted spellings, and any match passes

One gateway serves four dialects at once, and each client reaches for its own field. Accepting one
spelling would ask a person to reconfigure whichever client stays silent in it. This feature exists
to prevent that failure rather than to cause it.

Any-match rather than first-candidate carries the weight here. Claude Code fills `x-api-key` from its
own environment either way, so first-candidate would refuse a request whose `Authorization` header
carried the right key.

**Alternatives considered:** `Authorization` alone, rejected above. First candidate wins, rejected
because a placeholder in one field would mask a valid key in another.

### 5. Health stays open, everything else closes

A health path exists to prove the listener answers, and one that needs a credential can't. The
management and WebSocket paths close, because they carry usage, logs, and turns.

**Alternatives considered:** closing health too, rejected because it breaks the one job a health path
holds. Leaving the management paths open, rejected because they read account activity.

### 6. One 401 for an absent key and for a wrong one

Two messages would tell a caller whether a gateway holds a key at all, and tell a person nothing the
status code hasn't already said.

**Alternatives considered:** distinct messages for the two states, rejected above.

### 7. The refusal body is Anthropic-shaped for every dialect

`guardLoopback` answers one `AnthropicRefusal` to every caller, whatever dialect the path belongs to.
The key guard sits beside it and matches it. Rendering per dialect would mean parsing the path for a
dialect before the request has earned an answer at all.

**Alternatives considered:** `renderRefusal` with a dialect derived from the path, rejected because
it puts dialect inference in front of the authentication check and disagrees with the guard beside
it.

### 8. The requirement rides beside the key, and turning it off keeps the key

A person needs to stop enforcing a key without destroying it. ADR 0047 settled the same question for
the retired app-wide token, and gave the reason. A person who turns the switch back on should meet the
same token rather than a new one. Per gateway the argument grows stronger, because the key already
sits in however many clients that person configured.

The two facts travel as one nested field rather than two siblings, so the schema can't express a
requirement with no key behind it.

The engine snapshot stays a bare optional string, present only where the gateway enforces the key.
Main resolves the flag, so the guard mounts on presence alone and the child never holds a key it has
no use for.

**Alternatives considered:** `apiKey?: string` beside `requireApiKey?: boolean`, rejected because it
admits a fourth state nobody has a meaning for. Deleting the key when the requirement goes off,
rejected because it forces a person to reconfigure every client to undo one switch. Carrying the flag
into the engine, rejected because the child would hold a secret it must never act on.

### 9. A document change reapplies to a serving gateway and never starts a stopped one

The watcher's upsert path calls `restart` unconditionally, so an edit to a stopped gateway's document
starts it. The rewrite path through `gateways:update` already guards this with `restartIfServing`, so
the defect reaches only edits made outside the app.

This change repairs it rather than filing it, because the API key makes the consequence a security
one. A hand edit that drops a stopped gateway's key would have the app stand that gateway up, open. The
edit asked for nothing of the kind.

The lifecycle gains `reapply` beside `restart`, and the watcher moves onto it. Reapply skips a gateway
whose state isn't `running`.

The two names stay apart because two different things ask. A restart is a person picking Restart from
the menu bar, and it acts. A reapply is a document that changed, and it never reads as a request to
serve. Folding them into one name would have made the domain lean on a menu item's `enabled` flag for
its correctness.

**Alternatives considered:** guarding inside `EngineHost.restart`, rejected because `movePort` restarts
a gateway that stopped on a port conflict on purpose, and the guard would break that recovery. Guarding
in the watcher wiring, rejected because the wiring holds no engine state and would need a new port
threaded to it. One guarded name for both callers, rejected above. Leaving it as a rider, rejected by
the maintainer.

### 10. The key gets its own section, the switch applies at once, and only the regeneration asks

The maintainer picked option B from three drawn alternatives. The drawer's rhythm is already heading
plus box, three times over, and the Access section takes the same shape. It also leaves room for the one
line that names the fields a client can carry the key in, which neither of the other two options had
space for.

Nothing in the section is a field a person types into, so nothing waits for a save. `Switch` already
documents itself as a control for a value that applies the moment it changes, and the repository's own
settings screen works that way.

The regeneration asks first, through `ConsequenceDialog`. It's the only act here that destroys
something: a key the person already pasted into their clients. Turning the requirement off asks nothing,
because it takes a door off its latch rather than changing the lock. Turning it on asks nothing either,
because the person just asked for exactly that.

Option C, the one-time reveal most hosted APIs use, loses on a fact rather than a preference. That
pattern rests on the server being unable to retrieve the key. Decision 1 puts the key in a plain
document, so the app can retrieve it and so can the person. A screen promising that nothing reveals the
key again would say something the storage doesn't back.

**Alternatives considered:** option A, a row inside General Info, rejected on two counts. It mixes the
gateway's identity with its security in one box, and it leaves the value row without a label. Option C,
the one-time reveal, rejected above. A save button for the section, rejected because a switch that waits
for a save reads as broken. Asking before turning the requirement off, rejected because the question
would train a person to dismiss questions.

## Test matrix

| Layer          | What this layer proves (or why none)                                                                                                                                                                                                                                                                                           | Check command                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Unit           | The mint's shape and entropy width. The mask hides the middle and shows no tail for a short value. `withGatewayApiKey` adds and removes. A version 2 document reads at 3. The guard serves each accepted spelling, serves on any match among several, refuses an absent key and a wrong one, and lets the health paths through | `pnpm test -- packages/contracts packages/engine`    |
| Integration    | A built gateway app refuses a model request and a management request without the key, and serves both with it. `engineGatewayOf` carries the field onto the snapshot and omits it when the document holds none                                                                                                                 | `pnpm test -- packages/engine apps/desktop/src/main` |
| End-to-end     | A person mints a key in the drawer and saves. A request to the port without it draws a refusal, and one with it draws an answer. Removing the key opens the gateway again                                                                                                                                                      | `pnpm run test:e2e`                                  |
| Property       | Under fast-check over arbitrary keys, the mask never shows the key's first character past a matched prefix, always ends in the last four for a long enough key, and never equals the key. Each property carries a deterministic twin, because a property's random seed hides it from Stryker's per-test filter                 | `pnpm test -- packages/contracts`                    |
| Mutation scope | The diff-scoped Stryker gate covers `gateway-api-key.ts`, `gateway-config.ts`, `api-key-guard.ts`, `refusals.ts`, and `stored-gateway.ts`                                                                                                                                                                                      | `pnpm run test:mutation`                             |

## Task decomposition hooks

- Task 1: The contract module and the stored field (depends on: none, hands off:
  `mintGatewayApiKey`, `maskGatewayApiKey`, `withGatewayApiKey`, `enforcedApiKey`,
  `GatewayConfig.apiKey`, `EngineGateway.apiKey`)
- Task 2: The engine guard (depends on: Task 1, hands off: `guardApiKey`, `apiKeyRequired`, the
  mounted middleware)
- Task 3: The main-process delivery (depends on: Task 1, hands off: a snapshot carrying the key only
  where the gateway enforces it)
- Task 4: The renderer control and its wiring (depends on: Task 1, hands off: the component and the
  save)
- Task 5: The reapply repair (depends on: none, hands off: `GatewayLifecycleRequests.reapply`)
- Task 6: The end-to-end features (depends on: Tasks 2, 3, 4, 5, hands off: nothing)
- Task 7: The record (depends on: Task 1, hands off: nothing)

Tasks 2, 3, 4, and 5 own disjoint files and run in parallel once Task 1 lands. Task 5 shares no file
with any other task and can start immediately.

## Risks

- [Risk] A person sets a key, forgets, and every client fails at once with a 401 no screen explains
  → Mitigation: the row states in edit mode that clients need the key, and the refusal body names the
  gateway, so the failing client prints which one to fix.
- [Risk] Saving the key restarts the gateway and drops requests in flight → Mitigation: existing
  behavior for any document edit, and the end-to-end feature asserts the gateway serves again after
  the save.
- [Risk] The key reaches a log through a path this design never read → Mitigation:
  `requestCallerFingerprint` already hashes, and a task asserts that no engine log row carries a raw
  credential.
- [Risk] A hand-edited key with surrounding whitespace never matches → Mitigation: the guard trims
  each candidate, and the comparison takes the stored value as it stands.
- [Risk] Renaming the lifecycle request touches four threading files and could drop a caller →
  Mitigation: the type is a total object, so a missed caller fails typecheck rather than going quiet.
- [Risk] `reapply` reads the stored document before it checks the state, spending a read on a gateway
  it will skip → Mitigation: accepted. The read is cheap, it happens only on an external edit, and the
  alternative loses the log line that says the engine wasn't ready.

## Migration and rollout

Forward: a version 2 document reads through the identity migration and carries no key. Every stored
gateway keeps serving exactly as before, and nobody has to do anything.

Backward: a build predating this change reads a version 3 document, answers `GatewayNewerSchemaError`
and leaves the file where it stands. The person meets the existing newer-schema notice and loses
nothing.

No data moves. This change writes and deletes no vault entry.

## Open questions

None.

## End-to-end verification

In the packaged app: create a gateway, bind a virtual model, mint a key in General Info, save, and
confirm the gateway serves again. From a terminal, ask the gateway's `/v1/models` with no key and
read a 401 carrying the gateway's name and a `WWW-Authenticate` header. Ask again with
`Authorization: Bearer <key>` and read the model list. Ask once more with `x-api-key` to prove the
second spelling. Remove the key, save, and confirm the keyless request draws the model list. Look at
the drawer in both color schemes through `claude-in-chrome`, and read the row's accessible names off
the page rather than by eye.

A fresh-context reviewer diffs against these criteria. The key never renders in full on any surface.
No gate grows weaker. The diff carries no code comment. Every new renderer component under `ui/` owns
its folder and its stories sibling. The version bump carries a migration and a spec for it.
