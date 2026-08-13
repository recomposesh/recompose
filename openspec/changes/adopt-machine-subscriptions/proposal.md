## Why

Adding a subscription opens a terminal window. The window runs the provider's tool against a config home recompose created moments earlier. That home is empty, so the tool treats the run as a first run. It asks its onboarding questions before it ever reaches the sign-in.

A person who signed into Claude Code this morning answers a theme question, a trust question, and a sign-in-method question. All it buys recompose is an account they already have.

That account already sits on the machine. Claude Code keeps it in the login keychain. Codex keeps it in its own configuration directory. Reading what already sits there turns a terminal window and four questions into one button.

The terminal survives. It's the only way to reach an account other than the one on the machine, and that case is real. It stops being the first thing a person meets.

## What changes

A person adding a subscription sees the account recompose found on the machine, named by address and plan, and connects it with one act. Signing in with a different account stays reachable as a quiet second act, and no longer walks through onboarding.

An adopted account and a signed-in account differ in one way after connection. That difference is who renews the credential, and it decides what the account's row offers.

A signed-in account belongs to recompose alone. recompose created its config home, no other program knows the home exists, and recompose renews that credential itself. That's what the code does today. The living spec claims the app never renews a token itself, which held once and holds no longer, so this change corrects the record rather than the code.

An adopted account shares its credential with the tool a person uses every day. Both providers spend the refresh token on every renewal and reject the token that went before it. A second renewer therefore signs the person out of their own tool. A shipped product proves it. CodexBar renewed an adopted Anthropic credential itself, and its users had to sign into Claude Code about once a day. The maintainer reverted the behavior. OpenAI states the same rule for its own credential file, in writing, in its continuous-integration guide.

So recompose never renews an adopted credential. It reads the live store on each serving turn. When the credential nears expiry, it runs the provider's own tool with no window, behind a lock, then reads the store again. Rotation stays with the program that owns it.

When the tool has gone or the run fails, the account reports itself lapsed and names what to open. The surface needs that state anyway, for a credential the vendor revoked.

### One repair comes first, and it fixes a live defect

Claude Code derives its keychain service name from the config home. `discovery/machine-probe.md` confirms the formula against three real homes, one of which is recompose's own.

`credential-custody.ts` names a single vendor service for two different items. One is what the machine already holds, the other is what a recompose sign-in produces. Those aren't the same item, and treating them as one breaks both directions.

It breaks adoption, which the design critique caught. A sign-in parks the person's item, clears it, and on success writes a recompose account's credential there. An adopted account reading that item would serve as whichever account recompose last wrote. Wrong account, no error, nothing on screen.

It also breaks the sign-in it exists to serve. The probe found no Anthropic subscription on a machine that has tried to connect one. It found a pending home the tool wrote to and left, and the credential sitting under the derived name. A sign-in clears the plain item, then polls the home and that same cleared item. Both stay empty until the poll gives up. Codex escapes only because its seeded config forces the credential into a file inside the home.

So the repair isn't a precondition for a feature. It's a fix for a sign-in that can't currently succeed on macOS. recompose addresses the item belonging to the home it created, leaves the person's item alone, and falls back to the plain name for a version that never derived.

## Locked decisions

1. **Adoption reads the live store on every serving turn.** recompose keeps no long-lived copy of an adopted refresh token.
2. **recompose never calls a token endpoint for an adopted credential.** Near expiry it runs the provider's own tool, behind a lock that admits one renewal at a time.
3. **A failed delegated renewal leaves the credential alone** and marks the account lapsed. Nothing deletes a credential because a renewal failed.
4. **Renewal ownership follows the account, not the provider.** recompose keeps renewing what it signed in, because it owns that config home alone.
5. **A new field on the stored account row carries where the account came from.** `credentialPolicy` looked like the seam and isn't: it carries in-flight and concurrency tuning. This needs a version bump and a migration, and every stored account today answers "signed in."
6. **Adoption never touches the custody machinery.** It never parks, clears, places, or takes over anything.
7. **The keychain item recompose addresses follows the config home.** A recompose sign-in reads and writes the item derived from the home it created. The person's own item stays untouched. Reads probe the derived name and fall back to the plain one, so a version that never derived still resolves.
8. **Detection splits from adoption.** Detection reports that an account exists, with its address and plan, and returns no credential material. Adoption returns the material, and only a person's click causes it. Detection carries an explicit stale time and never asks again on mount.
9. **A row's remedy branches on where its account came from.** An adopted account offers the tool to open. A signed-in account keeps today's sign-in-again act. One attention word covers "not working" for both, because a second amber word a person can't act on helps nobody.
10. **The account view carries provenance.** Provenance decides which remedy a row offers and whether recompose touches the credential, so a person who can't see it can't predict what the row does.
11. **Both providers ship.** Anthropic reads the login keychain on macOS and the credentials file elsewhere. OpenAI reads its configuration directory, and the keyring where the file is absent.
12. **The sign-in config home gets seeded past onboarding.** `discovery/machine-probe.md` confirms the file location and the flags against the shipped tool.

## Capabilities

### New capabilities

- **Adopting a credential already on the machine.** recompose reports what each provider's own store holds and connects it as an account with no sign-in.
- **Renewal delegated to the owning tool.** recompose runs the provider's tool to renew an adopted credential near expiry, and never calls a token endpoint for one. A renewal that can't run reports a lapsed account rather than a broken one.
- **A lapse a person can act on.** A connected account whose credential stopped working reads differently from an account nobody ever connected, and names the tool to open.

### Modified capabilities

- **The provider's own tool performs the sign-in.** The requirement's blanket claim that the app never renews a token itself gets corrected. Renewal ownership now follows the account.
- **A sign-in leaves the person's own login alone.** recompose addresses the keychain item belonging to the home it created, rather than the one its own tool reads.
- **Connecting a subscription.** Sign-in stops being the only way in. The surface leads with what the machine holds.
- **The sign-in config home.** A home handed to Anthropic's tool arrives seeded, so the tool doesn't treat the run as a first run.

## Design-system gap analysis

No new token. One new component, and one gap worth naming before implementation meets it.

The connect step runs in the narrow sheet, which leaves a 320 pixel centered column. A two-section split belongs to wide left-aligned pages and doesn't survive that width, especially when each section holds one item. So the step keeps the anatomy it already has: the picked identity at the head, a verdict slot that reserves its height, then the act. The found account becomes the answer inside that anatomy, and sign-in demotes to a quiet act beneath the primary. At this width a second choice is a link, not a section.

The adopt act sits in the found-account row, trailing, the way the Coda and Linear references place it. It doesn't go in the sheet's action slot, which portals into a foot that already holds Cancel. Putting it there would leave three acts sharing two button weights, with the second choice reading at the same weight as Cancel.

The found-account row is a new component with its own folder and a stories sibling. The existing subscription row looks right but isn't reusable: it renders a list item bound to a connected account view and two mutations that have no meaning before connection.

**The gap:** the theme defines two button weights. This surface wants three levels, which are adopt, sign in, and cancel. Position carries the third level here, and that works because the acts sit in different places. A future surface that needs all three in one row will need a third weight.

Three states need copy that reads apart: a machine with nothing on it, a store that refused to open, and a record carrying no account credential. A refusal also needs a way back, because dismissing a system prompt is one keystroke and today there'd be no retry. The runtime-detection step in the same slice already solved that shape.

Copy states the fact and the remedy in one sentence, in second person. No first person plural anywhere, and nothing that narrates a scan.

## Non-goals

- Minting a credential through recompose's own authorization flow. The provider's tool stays the only thing that signs a person in.
- An affordance for choosing which account the provider's tool answers to. The channel exists, nothing on screen calls it, and this change doesn't change that.
- Enumerating more than one account per provider from the machine. One store, one account.

## Impact

The stored accounts document gains a field recording where an account came from, because renewal ownership hangs off it. That means a version bump and a migration. Every account stored today came from a sign-in, so the migration has one answer.

The account view gains the same field, so a row can read it.

The engine's renewal path becomes conditional on that field. Today it renews every subscription credential the same way. This carries the widest blast radius of anything here, and it's the piece that keeps a person's own tool working.

Credential custody stops addressing one keychain item for two purposes. A sign-in now reads and writes the item derived from the home it created. This repairs behavior that reaches a person's own Claude Code login today, and adoption isn't safe until it lands.

An existing account keeps its home, its credential, and its renewal behavior. Its keychain item moves to the derived name on first use, and a read that misses there falls back to the plain name, so nothing strands.

Linux and Windows have no path today that reads a credential outside a recompose-owned home, and this change adds one. Only macOS admits local verification, so specs that take the platform as a parameter cover the rest, the way the credential store's specs already do.

## Open questions

- Which Claude Code version changed the keychain naming scheme. `discovery/machine-probe.md` settles the scheme and not the boundary, and probing both names makes the boundary moot.
- Whether an end-to-end scenario can plant a credential that predates recompose. No fixture does it today, and the OpenAI side has no fake tool at all.
