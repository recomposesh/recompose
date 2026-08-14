# Code map

Every path below was read in the working tree at `1f490aec`.

## The stored shape

- `packages/contracts/src/gateway-config.ts:114` holds `gatewayConfigSchema` as a `z.strictObject`
  at `GATEWAY_CONFIG_VERSION` 2. Line 130 holds the one migration, an identity bump from 1, which is
  the precedent shape for a version bump that changes no stored value.
- `packages/contracts/src/non-blank.ts` holds `nonBlankString`, the refinement every free-text field
  in the contracts already uses.
- `apps/desktop/src/main/storage/gateway-config-hash.ts:20` hashes the whole document, so a new
  field joins the change detection with no edit.
- `apps/desktop/src/main/storage/gateway-watcher-wiring.ts:17` restarts the gateway on every upsert.
  An edit therefore reaches the running listener without a new signal.

## The wire

- `packages/engine/src/gateway-app.ts:256` mounts `guardLoopback` as the first middleware, then
  `openServingTurn`. A key guard belongs on line 257, after the loopback answer and before the turn
  opens, so a refused request never counts as served traffic.
- `packages/engine/src/loopback-guard.ts` is the shape a second guard copies: a factory that closes
  over gateway facts and returns a `MiddlewareHandler` answering `c.json(refusal, status)`.
- `packages/engine/src/refusals.ts:48` holds `nonLoopbackClient` and `requestCarriesOrigin`, both
  `AnthropicRefusal` bodies served to every dialect. The key refusal joins them.
- `packages/engine/src/gateway-app.ts:269` registers `/health` and `/healthz`. Nothing in
  `apps/desktop/src/main` calls either over HTTP; the only caller in the tree is
  `packages/engine/src/gateway-codex-alpha-search-parity.test.ts:214`.
- `packages/engine/src/management-usage.ts:41` and `packages/engine/src/management-logs.ts:73`
  register `/v0/management/usage-queue` and `/v0/management/logs`. Both leak account activity and
  belong behind the key.
- `packages/engine/src/gateway-session.ts:96` already reads `authorization` and `x-api-key` for
  `requestCallerFingerprint`, and stores a SHA-256 digest rather than the value. No log path in the
  engine writes an inbound credential in plain text.

## The delivery path into the engine

- `packages/contracts/src/engine-protocol.ts:32` holds `engineGatewaySchema`, the snapshot a start
  directive carries.
- `apps/desktop/src/main/engine-host/stored-gateway.ts:44` mints that snapshot from the stored
  document and the settings document. `bindAddress` on line 58 is the precedent for an optional
  field that travels only when it carries a value.
- `apps/desktop/src/main/engine-host/engine-host.ts:207` restarts by stopping and starting with the
  fresh snapshot, so a changed key reaches the listener through the ordinary restart.

## The screen

- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/gateway-general-info/gateway-general-info.tsx`
  holds the General Info box: one editable name row, an edit and save footer, and a usage link. The
  key row joins this box.
- `apps/desktop/src/renderer/src/pages/gateway-canvas/ui/subject-shell/subject-shell.tsx` supplies
  `factRow`, `editRow`, `editFooter`, and `editableSectionHeading`.
- `apps/desktop/src/renderer/src/shared/api/gateways.ts:49` holds `useDefineVirtualModel`, which
  writes a whole `GatewayConfig` through `gateways:update`. The key needs no channel of its own.
- `apps/desktop/src/renderer/src/shared/ui/copy-button/copy-button.tsx` copies through
  `navigator.clipboard.writeText` from the renderer, which is how `AddressPill` copies the address
  today.

## Prior art in the repository

- `docs/adr/0047-gateway-token-vault-and-clipboard.md` fixed the mint shape, the mask shape, and the
  no-reveal decision for the retired app-wide token.
- `docs/adr/0062-a-schema-version-names-one-shape.md` fixes when a stored shape needs a version.
- Commit `413318c8` retired the app-wide token and named this change as its successor.

## Consulted, no impact

- `packages/engine/src/plugin-auth.ts` carries outbound credential shaping for plugins, not inbound
  authentication.
- `apps/desktop/src/main/storage/vault.ts` and `safe-storage-codec.ts` hold the encrypted store this
  change decided against.

## The restart defect, now in scope

- `apps/desktop/src/main/engine-host/engine-host.ts:207` stops and starts unconditionally.
- `apps/desktop/src/main/ipc/gateway-storage-ipc.ts:76` holds `restartIfServing`, so the rewrite path
  through `gateways:update` already guards it.
- `apps/desktop/src/main/storage/gateway-watcher-wiring.ts:18` does not, so an edit made outside the
  app starts a stopped gateway.
- `apps/desktop/src/main/storage/gateway-config-watcher.ts:121` holds `noteWrite`, which pre-seeds the
  hash for the app's own writes. That is why the defect reaches external edits only.
- `apps/desktop/src/main/ipc/engine-ipc.ts:74` calls `EngineHost.restart` from `movePort` on a gateway
  that stopped on a port conflict, deliberately starting it. The repair therefore belongs to the
  lifecycle request the watcher holds, never to `EngineHost.restart`.
- `apps/desktop/src/main/engine-host/gateway-lifecycle-requests.ts:63` is the only caller chain the
  watcher uses, threaded through `storage-watchers.ts`, `stored-boot.ts`, and `index.ts`.
- `packages/contracts/src/engine-state.ts:5` gives the state two values, `running` and `stopped`, so
  the guard reads one comparison.
