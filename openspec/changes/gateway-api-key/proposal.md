## Why

A gateway answers whoever reaches its port. The only thing standing between a request and a paid
account is `guardLoopback`, which asks two questions: does the request arrive on this machine, and
does it carry an `Origin` header. Both answers are about where the caller sits, never about who the
caller is.

That held while every gateway bound the loopback interface. It stopped holding when the settings
document grew `bindAddress`. A person who binds a gateway to a routable address hands out the quota
of every account behind it. Anyone on the network can spend it, and recompose offers that person
nothing to close the door with.

The app used to carry a token. `SETTINGS_VERSION` 3 held `requireGatewayToken`, and commit
`413318c8` retired it. That commit's message gives the reason and names the successor. Each gateway
owns its port, so a token guards one origin rather than the app. The rows behind it belong to the
gateway settings feature, where a leak costs one client rather than every client. That feature now
exists. This change delivers the half that stayed behind.

## What changes

A gateway carries an optional API key and the answer to whether callers have to present it. Where it
requires one, a request reaches nothing without it. Where it requires none, the gateway answers exactly
as it does today, so no stored gateway changes behavior on upgrade.

A person turns the key on, copies it into their clients, regenerates it when it leaks, and turns it off
again. Turning it off keeps the stored key, so turning it back on meets the key those clients already
carry rather than a fresh one nobody has. The app mints, and never asks a person to invent a
credential.

The change also repairs something the key made dangerous. A change to a gateway document currently
restarts that gateway even when it stands stopped, so an edit made outside the app stands a stopped
gateway up. Put a key in that document and the consequence turns. A hand edit that drops the key would
have the app start the gateway open, on the strength of an edit that asked for nothing of the kind. A
document change now reaches a serving gateway and leaves a stopped one stopped.

On the wire the gateway accepts the key in the four places its four dialects put one:
`Authorization`, `x-api-key`, `x-goog-api-key`, and the `key` query parameter. A request that
presents several candidates passes when any one of them matches. A client that fills its own field
with a placeholder and carries the real key in another is the ordinary case rather than an attack.

The health paths stay open. Every other path moves behind the key, the management usage and log
paths and the WebSocket paths included.

## Locked decisions

1. **The key lives in the gateway document, not the vault.** Architecture Decision Record (ADR) 0047
   put the retired app-wide token in the vault under a fixed reference. This change departs from that
   shape, and its own record states the departure rather than leaving a reader to find it. The
   document already travels to the engine child, to the renderer, and through the config watcher. The
   vault would buy encryption at rest and charge a per-gateway reference, a mint channel, a status
   channel, a copy channel, and a second delivery path into the child.
2. **The document version moves to 3.** A document carrying an unknown key fails the strict parse of
   any build that predates this change and goes to quarantine, which is the exact defect ADR 0062
   records. The bump makes an older build answer `GatewayNewerSchemaError` and leave the file alone.
3. **The app mints, and the schema doesn't police.** The mint reads 32 bytes from the platform random
   source and spells them as unpadded base64url behind an `rc-local-` prefix, which is the shape ADR
   0047 fixed. The stored field accepts any non-blank string. A person who hand-edits the document,
   or who arrives from CLIProxyAPI with a key their clients already carry, reads it back rather than
   losing the gateway to quarantine.
4. **Four spellings, and any match passes.** One gateway serves the Anthropic, Chat Completions,
   Responses, and Gemini dialects at once. A single accepted spelling would ask a person to
   reconfigure whichever client doesn't speak it.
5. **The health paths answer without a key.** A health path that needs a credential can't do the job
   a health path exists for.
6. **The comparison is constant time over keyed tags.** Both sides reduce to a SHA-256 tag under a
   secret each guard mints at start, then meet `timingSafeEqual`. The compare leaks neither the
   length of the key nor the length of its matching prefix, and nobody can compute the tag of a
   guess offline.
7. **The refusal is 401 in the shape `guardLoopback` already answers.** One Anthropic-shaped body
   serves every dialect, matching the guard that sits beside it. It carries `WWW-Authenticate:
Bearer`, because Request for Comments (RFC) 6750 asks a bearer-protected resource for it.
8. **The requirement rides beside the key as one field, and turning it off keeps the key.** ADR 0047
   settled the same question for the retired app-wide token: a person who turns the switch back on
   meets the token they had. Two sibling fields would admit a requirement with no key behind it, so the
   value and the flag travel as one nested field. The engine snapshot carries the key only where the
   gateway enforces it, so the child never holds a secret it must not act on.
9. **A document change reapplies to a serving gateway and never starts a stopped one.** The rewrite
   path already guards this. The watcher path doesn't, and the key turns that gap into a security
   consequence rather than a surprise.

## Capabilities

### New capabilities

- **A gateway that asks who is calling.** An optional key per gateway, minted by the app, that every
  path but health requires.
- **A switch a person can turn both ways.** Turning the requirement off opens the gateway and keeps the
  key, so turning it on again asks nothing of the clients that already hold it.
- **A key a person can replace.** Minting again over a key that leaked replaces one gateway's
  credential without touching any other gateway.

### Modified capabilities

- **The gateway's General Info.** It carries the key control beside the name, in the same edit and save
  act.
- **What a gateway answers.** A request without a valid key stops at the front door with a typed 401
  rather than reaching a virtual model.
- **What a document change does.** It reaches a gateway that serves, and leaves a stopped one stopped.
