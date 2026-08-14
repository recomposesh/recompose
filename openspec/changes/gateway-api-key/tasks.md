## Implementation tasks

Every task runs test-first. The failing run goes into the task report before the implementation
lands, and one green commit carries the pair. Tasks 2, 3, and 4 own disjoint files and run in
parallel once Task 1 lands.

### Task 1: The contract owns the value

- [ ] `packages/contracts/src/gateway-api-key.ts` holds `GATEWAY_API_KEY_PREFIX`,
      `gatewayApiKeySchema`, `mintGatewayApiKey`, `maskGatewayApiKey`, `withGatewayApiKey`, and
      `enforcedApiKey`
- [ ] Specs prove `enforcedApiKey` answers the value for a required key, and nothing for a stored key
      the gateway doesn't require, and nothing for a gateway holding none
- [ ] Specs prove the mint carries the prefix, 43 base64url characters, and no padding
- [ ] Specs prove two mints differ
- [ ] Specs prove the mask hides everything between the prefix and the last four characters, and
      that it shows no tail at all for a value too short to hide eight characters
- [ ] Specs prove `withGatewayApiKey` adds a key, replaces a key, turns the requirement off while
      keeping the value, and drops the field for `undefined`
- [ ] Property specs over arbitrary keys, each beside its deterministic twin
- [ ] `gatewayConfigSchema` carries `apiKey` as one nested field holding the value and the
      requirement, `GATEWAY_CONFIG_VERSION` reads 3, and a migration from 2 bumps the version and
      changes nothing else
- [ ] A type-level spec asserts the schema admits no requirement without a key
- [ ] `engineGatewaySchema` carries `apiKey`
- [ ] The type-level spec asserts the field stays optional on both derived types
- [ ] The barrel exports the module

### Task 2: The engine owns the check

- [ ] `apiKeyRequired(displayName)` joins the two loopback refusals in `refusals.ts`
- [ ] `packages/engine/src/api-key-guard.ts` holds `guardApiKey(displayName, apiKey)`
- [ ] Specs prove each of the four spellings serves, with a `Bearer` prefix and without one
- [ ] Specs prove a request presenting a wrong candidate beside a right one serves
- [ ] Specs prove an absent key and a wrong key draw the same 401 body and the same
      `WWW-Authenticate` header
- [ ] Specs prove `/health` and `/healthz` serve without a key
- [ ] Specs prove a candidate carrying surrounding whitespace still matches
- [ ] `createGatewayApp` mounts the guard after `guardLoopback` and before `openServingTurn`, and
      mounts nothing when the snapshot carries no key
- [ ] Specs through a built app prove a model path and a management path refuse without the key and
      serve with it, and that a gateway holding no key keeps today's answers
- [ ] A spec proves no engine log row carries an inbound credential in plain text

### Task 3: The main process owns delivery

- [ ] `engineGatewayOf` reads `enforcedApiKey` and copies the value onto the snapshot only where the
      gateway enforces it
- [ ] Specs prove the snapshot carries the key for a required one, and that the property stays absent
      rather than undefined for a stored key the gateway doesn't require and for no key at all
- [ ] A spec proves `gateways:update` writing a document without the field leaves no key stored

### Task 4: The renderer owns the act

The maintainer picked option B, so the key gets an Access section of its own.

- [ ] `ui/gateway-access/gateway-access.tsx` renders the heading with its `Switch`, the box holding the
      masked key beside a `CopyButton` and a regenerate row, and the line naming the fields a client can
      carry the key in
- [ ] `subject-bodies.tsx` mounts the section between General Info and Endpoint
- [ ] Regenerating goes through `ConsequenceDialog`, and the question names what breaks
- [ ] Its `*.stories.tsx` sibling covers off, on, and the regeneration question
- [ ] Browser specs prove the switch reads off for a gateway requiring nothing, turning it on mints a
      key and requires it, turning it off keeps the stored value, and the copy control carries the whole
      value
- [ ] Browser specs prove the section never renders the whole key, and that declining the regeneration
      question leaves the stored key alone
- [ ] Browser specs prove no act in the section waits for a save
- [ ] A pass through `claude-in-chrome` in both color schemes, reading accessible names off the page
      rather than by eye
- [ ] The dark scheme pair of option B lands in `designs/recompose.pen`, and the two rejected option
      frames leave it

### Task 5: A document change never starts a stopped gateway

- [ ] `GatewayLifecycleRequests.restart` becomes `reapply` and skips a gateway whose state isn't
      `running`, threaded through `gateway-watcher-wiring.ts`, `storage-watchers.ts`,
      `stored-boot.ts`, and `index.ts`
- [ ] Specs prove a serving gateway reapplies under the changed document
- [ ] Specs prove a stopped gateway stays stopped, and that nothing starts a listener on its port
- [ ] Specs prove the engine-not-ready failure still reaches the log
- [ ] A spec proves `movePort` still restarts a gateway that stopped on a port conflict, because that
      path calls `EngineHost.restart` rather than the lifecycle request

### Task 6: The whole loop

- [ ] `gherkin/engine/api-key.feature` and `gherkin/gateways/api-key.feature` graduate unchanged to
      `apps/desktop/e2e/features/`, each landing in the same commit as its step file
- [ ] `steps/engine-api-key.steps.ts` drives the refused request, the four accepted spellings, the
      open health path, the closed management path, and the requirement turned off
- [ ] `steps/gateways-api-key.steps.ts` drives the switch, the copy, the regeneration, the switch back
      off, and the stopped gateway that stays stopped
- [ ] Both written through the `playwright-best-practices` and `gherkin-best-practices` skills

### Task 7: The record

- [ ] The Architecture Decision Record (ADR) through the `architecture-decision-records` skill,
      stating the departure from ADR 0047, the exposure that departure accepts, the version bump ADR
      0062 required, and why the requirement flag rides beside the key
- [ ] The ADR index carries it

### Closing

- [ ] The prose and spelling gates run once at the end, and one editing pass answers every finding
- [ ] The full local battery runs green before the branch reaches continuous integration
