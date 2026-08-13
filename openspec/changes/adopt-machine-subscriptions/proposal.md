## Why

Adding a subscription opens a terminal window. The window runs the provider's tool against a config home recompose created moments earlier. That home is empty, so the tool treats the run as a first run. It asks its onboarding questions before it ever reaches the sign-in.

A person who signed into Claude Code this morning answers a theme question, a trust question, and a sign-in-method question. All it buys recompose is an account they already have.

That account already sits on the machine. Claude Code keeps it in the login keychain. Codex keeps it in its own configuration directory. Reading what already sits there turns a terminal window and four questions into one button.

The terminal survives. It's the only way to reach an account other than the one on the machine, and that case is real. It stops being the first thing a person meets.

## What changes

A person adding a subscription sees what recompose found on the machine, named by address and plan, and connects it without a sign-in. Signing in with a different account stays available one section down, and no longer walks through onboarding.

An adopted account and a signed-in account differ in one way after connection. That difference is who renews the credential.

A signed-in account belongs to recompose alone. recompose created its config home, no other program knows the home exists, and recompose renews that credential itself. That's what the code does today. The living spec claims the app never renews a token itself, which held once and holds no longer, so this change corrects the record rather than the code.

An adopted account shares its credential with the tool a person uses every day. Both providers spend the refresh token on every renewal and reject the token that went before it. A second renewer therefore signs the person out of their own tool. A shipped product proves it. CodexBar renewed an adopted Anthropic credential itself, and its users had to sign into Claude Code about once a day. The maintainer reverted the behavior. OpenAI states the same rule for its own credential file, in writing, in its continuous-integration guide.

So recompose never renews an adopted credential. It reads the live store on each serving turn. When the credential nears expiry, it runs the provider's own tool with no window, behind a lock, then reads the store again. Rotation stays with the program that owns it.

When the tool has gone or the run fails, the account reports itself stale and names what to open. The surface needs that state anyway, for a credential the vendor revoked.

## Locked decisions

1. **Adoption reads the live store on every serving turn.** recompose keeps no long-lived copy of an adopted refresh token.
2. **recompose never calls a token endpoint for an adopted credential.** Near expiry it runs the provider's own tool, behind a lock that admits one renewal at a time.
3. **A failed delegated renewal leaves the credential alone** and marks the account stale. Nothing deletes a credential because a renewal failed.
4. **Renewal ownership follows the account, not the provider.** recompose keeps renewing what it signed in, because it owns that config home alone.
5. **A new field on the stored account row carries where the account came from.** `credentialPolicy` looked like the seam and isn't: it carries in-flight and concurrency tuning. This needs a version bump and a migration, and every stored account today answers "signed in."
6. **Adoption never touches the custody machinery.** It never parks, clears, places, or takes over the vendor keychain item. Sign-in blanks that item on its way past, and an adopted account reading through it would read the blank.
7. **Detection answers on its own channel.** It never rides `subscriptions:tools`, which the renderer refetches on every mount, because a keychain read there would ask the operating system for permission on every mount.
8. **Both providers ship.** Anthropic reads the login keychain on macOS and the credentials file elsewhere. OpenAI reads its configuration directory, and the keyring where the file is absent.
9. **Adoption reads the plain keychain service name.** The derived-name finding in `discovery/machine-probe.md` concerns the sign-in path, not this one, and rides out as its own issue.
10. **The sign-in config home gets seeded past onboarding.** `discovery/machine-probe.md` confirms the file location and the flags against the shipped tool.

## Capabilities

### New capabilities

- **Adopting a credential already on the machine.** recompose reports what each provider's own store holds and connects it as an account with no sign-in.
- **Renewal delegated to the owning tool.** recompose runs the provider's tool to renew an adopted credential near expiry, and never calls a token endpoint for one. A renewal that can't run reports a stale account rather than a broken one.
- **A stale standing.** A connected account whose credential stopped working reads differently from an account nobody ever connected, and names the tool to open.

### Modified capabilities

- **The provider's own tool performs the sign-in.** The requirement's blanket claim that the app never renews a token itself gets corrected. Renewal ownership now follows the account.
- **Connecting a subscription.** Sign-in stops being the only way in. The surface offers what the machine holds first.
- **The sign-in config home.** A home handed to Anthropic's tool arrives seeded, so the tool doesn't treat the run as a first run.

## Design-system gap analysis

No new token and no new component primitive. The connect step splits into two sections: what the machine holds, stated as an answer, above the sign-in path. `discovery/mobbin-references.md` carries the references, and the pattern comes from Coda's split between accounts it already knows about and everything that still needs work.

The row shape already exists in the providers slice, and every component there already follows the folder rule with a stories sibling. An adopted account and a signed-in account share one row afterward, in two states, rather than living in two lists.

Three states need copy that reads apart from each other: a machine with nothing on it, a store that refused to open, and a record that carries no account credential. The code reads all three alike today, and the screen must not.

## Non-goals

- Minting a credential through recompose's own authorization flow. The provider's tool stays the only thing that signs a person in.
- Handing back the credential recompose parked under the reserved slot. That behavior stands as it is.
- An affordance for choosing which account the provider's tool answers to. The channel exists and nothing on screen calls it, and this change doesn't change that.
- Repairing the derived keychain service name on the sign-in path.

## Impact

The stored accounts document gains a field recording where an account came from, because renewal ownership hangs off it. That means a version bump and a migration. Every account stored today came from a sign-in, so the migration has one answer.

The engine's renewal path becomes conditional on that field. Today it renews every subscription credential the same way. This carries the widest blast radius of anything here, and it's the piece that keeps a person's own tool working.

Nothing about an existing account changes. A subscription connected before this change keeps its home, its credential, and its renewal behavior.

Linux and Windows have no path today that reads a credential outside a recompose-owned home, and this change adds one. Only macOS admits local verification, so specs that take the platform as a parameter cover the rest, the way the credential store's specs already do.

## Open questions

- Whether the sign-in path still addresses the keychain item it means to, given the derived service name. It leaves as a rider.
- Which Claude Code version changed the keychain naming scheme. `discovery/machine-probe.md` settles the scheme and not the boundary.
- Whether an end-to-end scenario can plant a credential that predates recompose. No fixture does it today, and the OpenAI side has no fake tool at all.
