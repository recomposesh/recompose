## Implementation tasks

Every task runs test-first. The failing run goes into the task report before the implementation
lands, and one green commit carries the pair. Tasks 2, 3, and 4 own disjoint files and run in
parallel once Task 1 lands.

### Task 1: The contract owns the value

- [x] `packages/contracts/src/gateway-api-key.ts` holds `GATEWAY_API_KEY_PREFIX`,
      `gatewayApiKeySchema`, `mintGatewayApiKey`, and `maskGatewayApiKey`
- [x] `gateway-config.ts` holds `withGatewayApiKey` and `enforcedApiKey`, beside the document they
      rewrite, which is also what keeps the dependency one-way for the no-circular rule
- [x] Specs prove `enforcedApiKey` answers the value for a required key, and nothing for a stored key
      the gateway doesn't require, and nothing for a gateway holding none
- [x] Specs prove the mint carries the prefix, 43 base64url characters, and no padding
- [x] Specs prove two mints differ
- [x] Specs prove the mask hides everything between the prefix and the last four characters, and
      that it shows no tail at all for a value too short to hide eight characters
- [x] Specs prove `withGatewayApiKey` adds a key, replaces a key, turns the requirement off while
      keeping the value, and drops the field for `undefined`
- [x] Property specs over arbitrary keys, each beside its deterministic twin
- [x] `gatewayConfigSchema` carries `apiKey` as one nested field holding the value and the
      requirement, `GATEWAY_CONFIG_VERSION` reads 3, and a migration from 2 bumps the version and
      changes nothing else
- [x] A type-level spec asserts the schema admits no requirement without a key
- [x] `engineGatewaySchema` carries `apiKey`
- [x] The type-level spec asserts the field stays optional on both derived types
- [x] The barrel exports the module

### Task 2: The engine owns the check

- [x] `apiKeyRequired(displayName)` joins the two loopback refusals in `refusals.ts`
- [x] `packages/engine/src/api-key-guard.ts` holds `guardApiKey(displayName, apiKey)`
- [x] Specs prove each of the four spellings serves, with a `Bearer` prefix and without one
- [x] Specs prove a request presenting a wrong candidate beside a right one serves
- [x] Specs prove an absent key and a wrong key draw the same 401 body and the same
      `WWW-Authenticate` header
- [x] Specs prove `/health` and `/healthz` serve without a key
- [x] Specs prove a candidate carrying surrounding whitespace still matches
- [x] `createGatewayApp` mounts the guard after `guardLoopback` and before `openServingTurn`, and
      mounts nothing when the snapshot carries no key
- [x] Specs through a built app prove a model path and a management path refuse without the key and
      serve with it, and that a gateway holding no key keeps today's answers
- [x] A spec proves no engine log row carries an inbound credential in plain text

### Task 3: The main process owns delivery

- [x] `engineGatewayOf` reads `enforcedApiKey` and copies the value onto the snapshot only where the
      gateway enforces it
- [x] Specs prove the snapshot carries the key for a required one, and that the property stays absent
      rather than undefined for a stored key the gateway doesn't require and for no key at all
- [x] A spec proves `gateways:update` writing a document without the field leaves no key stored

### Task 4: The renderer owns the act

The maintainer picked option B, so the key gets an Access section of its own.

- [x] `ui/gateway-access/gateway-access.tsx` renders the heading with its `Switch`, the box holding the
      masked key beside a `CopyButton` and a regenerate row, and the line naming the fields a client can
      carry the key in
- [x] `subject-bodies.tsx` mounts the section between General Info and Endpoint
- [x] Regenerating goes through `ConsequenceDialog`, and the question names what breaks
- [x] Its `*.stories.tsx` sibling covers off, on, and the regeneration question
- [x] Browser specs prove the switch reads off for a gateway requiring nothing, turning it on mints a
      key and requires it, turning it off keeps the stored value, and the copy control carries the whole
      value
- [x] Browser specs prove the section never renders the whole key, and that declining the regeneration
      question leaves the stored key alone
- [x] Browser specs prove no act in the section waits for a save
- [x] A pass through `claude-in-chrome` in both color schemes, reading accessible names off the page
      rather than by eye
- [ ] The dark scheme pair of option B lands in `designs/recompose.pen`, and the two rejected option
      frames leave it

The one item this change leaves open, and why. The three option frames stand in `designs/recompose.pen`
in the editor's memory rather than on disk. The Pencil tools never write the file, and their
`filePath` reaches whatever document the app has open. The maintainer saves it, so the dark pair and
the removal wait on that save rather than on this branch.

### Task 5: A document change never starts a stopped gateway

- [x] `GatewayLifecycleRequests.reapply` joins `restart` and skips a gateway whose state isn't
      `running`, threaded through `gateway-watcher-wiring.ts`, `storage-watchers.ts`, and
      `stored-boot.ts`
- [x] `restart` stays for the menu bar's Restart, which is a person's own act rather than a document
      change
- [x] Specs prove a serving gateway reapplies under the changed document
- [x] Specs prove a stopped gateway stays stopped, and that nothing starts a listener on its port
- [x] Specs prove the engine-not-ready failure still reaches the log
- [x] `movePort` still restarts a gateway that stopped on a port conflict, because that path calls
      `EngineHost.restart` rather than the lifecycle request

### Task 6: The whole loop

- [x] `gherkin/engine/api-key.feature` and `gherkin/gateways/api-key.feature` graduate unchanged to
      `apps/desktop/e2e/features/`, each landing in the same commit as its step file
- [x] `steps/engine-api-key.steps.ts` drives the refused request, the four accepted spellings, the
      open health path, the closed management path, and the requirement turned off
- [x] `steps/gateways-api-key.steps.ts` drives the switch, the copy, the regeneration, the switch back
      off, and the stopped gateway that stays stopped
- [x] Both written through the `playwright-best-practices` and `gherkin-best-practices` skills

### Task 7: The record

- [x] The Architecture Decision Record (ADR) through the `architecture-decision-records` skill,
      stating the departure from ADR 0047, the exposure that departure accepts, the version bump ADR
      0062 required, and why the requirement flag rides beside the key
- [x] The ADR index carries it

### Closing

- [x] The prose and spelling gates run once at the end, and one editing pass answers every finding
- [x] The full local battery runs green before the branch reaches continuous integration
- [x] The diff-scoped mutation gate leaves no survivor on a file this change wrote
