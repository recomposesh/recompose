# 0106: A gateway carries its own key, in its own document

**Status**: Accepted
**Date**: 2026-08-14

## Context

A gateway answered whoever reached its port. `guardLoopback` asked where the caller sat and whether
it carried an `Origin` header, never who it was. That held while every listener bound the loopback
interface, and stopped holding when the settings document grew `bindAddress`.

The app carried an app-wide token once. `SETTINGS_VERSION` 3 held `requireGatewayToken`, and commit
`413318c8` retired it with the successor named in its message: each gateway owns its port, so a token
guards one origin rather than the app. This record is that successor.

Architecture Decision Record (ADR) 0047 settled where the retired token lived and closed by making
its shape the precedent for every later secret-bearing feature. This decision departs from that
precedent, which is the first reason it earns a record. The second is that it accepts an exposure the
storage can't close.

## Decision

**The key lives in the gateway document, beside the answer to whether the gateway requires it.** One
nested field carries both, so no stored gateway can name a requirement it holds no key for. Three
states exist and no fourth: no field at all, a stored key the gateway leaves unenforced, and a key it
enforces.

**Turning the requirement off keeps the value.** A person who turns it back on meets the key their
clients already hold. ADR 0047 gave the same answer for the app-wide token, and the argument grows
stronger per gateway, because the key sits in however many clients that person configured.

**`GATEWAY_CONFIG_VERSION` moves to 3.** An optional field describes the new reader and says nothing
about the old one. A version 2 document carrying an unknown key fails the strict parse of any build
that predates this change and goes to quarantine, which is the defect ADR 0062 recorded. At version 3
that build answers `GatewayNewerSchemaError` and leaves the file alone.

**The app mints, and the schema doesn't police.** The mint reads 32 bytes from the platform random
source and spells them as unpadded base64url behind the `rc-local-` prefix ADR 0047 fixed. The stored
field takes any non-blank string, so a hand-edited document reads back rather than costing a person
their gateway.

**The engine learns the key only where the gateway enforces it.** The parent resolves the requirement
and the snapshot carries a bare optional string. The child therefore never holds a secret it must not
act on, and its guard mounts on presence alone.

**Four accepted spellings, and any single match serves.** One gateway serves the Anthropic, Chat
Completions, Responses, and Gemini dialects at once. A caller may present the key in the
`Authorization` header, the `x-api-key` header, the `x-goog-api-key` header, or the `key` query
parameter. A client that fills its own field with a placeholder while carrying the real key in
another is ordinary rather than hostile.

**The health paths stay open, and an absent key answers as a wrong one does.** A health path that
needs a credential can't do the job it exists for. Splitting the two refusals would tell a caller
whether the gateway holds a key at all. The bytes meet `timingSafeEqual`, so nothing says how many
leading bytes a guess got right.

## Alternatives

- **The vault under a per-gateway reference**: buys encryption at rest through `safeStorage`, which
  falls back to plain text on a machine with no keyring anyway. Rejected on cost: a reference scheme,
  a mint channel, a status channel, a copy channel, a deletion path tied to gateway removal, and a
  second delivery path carrying the plaintext into the engine child beside the snapshot.
- **The vault with only the digest in the document**: the guard needs no plaintext, but the copy
  control does, which puts the read back where it started.
- **Two sibling fields, `apiKey` beside `requireApiKey`**: admits a fourth state nobody has a meaning
  for.
- **Deleting the key when the requirement goes off**: forces a person to reconfigure every client to
  undo one switch.
- **Keeping the document at version 2**: optional describes the new reader, not the old one.
- **A schema pinned to the minted shape**: turns a hand edit into a quarantined gateway.
- **`Authorization` alone**: asks a person to reconfigure whichever client stays silent in it, which
  is the failure this feature exists to prevent.
- **First candidate wins**: a placeholder in one field would mask a valid key in another.
- **A one-time reveal, the pattern most hosted APIs use**: rests on the server being unable to
  retrieve the key. Anyone can read a plain document back, so the promise would not hold.

## Consequences

**Good**: a person closes one gateway without touching another, replaces a leaked key in two clicks,
and turns the requirement off without breaking the clients that already hold the key. This change adds no channel. `gateways:update`
already carries a whole document, and the renderer copies through its own clipboard because the
plaintext is already there. A build that predates the field survives a
downgrade and says why it can't read the document.

**Bad, and accepted**: the key sits in plain text in the user data folder, so anything that reads
that folder reads the key. That covers a backup, a sync client, and any other process running as the
same person. The value guards a local listener and two clicks replace it, which is the trade. The
listener stays plain HTTP, so the deviation from Request for Comments (RFC) 6750 that ADR 0047
recorded stands. The 401 carries `WWW-Authenticate: Bearer`, because that half of the specification
costs one header.

Every caller of a guarded gateway now shares one `clientKey` fingerprint in the log, because the
gateway's key is what `requestCallerFingerprint` reads. That digest was never plaintext and the log
row's schema refuses anything but a digest, so nothing leaks. The reading simply stops separating
clients that present the same key.
