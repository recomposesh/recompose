# 0204: recompose signs in to Codex itself, and the Anthropic prohibition stands

**Status**: Accepted
**Date**: 2026-08-26

## Context

Adding a Codex subscription needed the Codex command-line tool on the machine. Without it, the
connect step showed a heading, a line saying Codex isn't installed, and one dead button. Nothing
else on the step moved. A person who pays for a ChatGPT plan and never installed Codex read that as
a broken screen. They were close to right, because recompose offered them no way in at all.

Architecture Decision Record (ADR) 0069 put that limit there on purpose. It decided that sign-in and
renewal run inside the provider's own tool. It rejected running the authorization flow inside
recompose twice over. The flagship provider forbids it, and a second refresher would recreate the
rotation split-brain the defect record is full of.

The first reason belongs to Anthropic, and it doesn't carry to OpenAI. Anthropic states that a third
party may not offer a claude.ai login. It refuses plan credentials at its interface, and it checks
which client calls. OpenAI publishes no such clause. Its consumer terms name automated extraction,
reverse engineering and rate-limit circumvention. They say nothing about a client outside OpenAI
holding a Codex plan grant. That's silence rather than permission. The research behind this record
couldn't open `openai.com/policies` or `help.openai.com` at all. Every quotation from those pages
came at second hand.

What OpenAI does carries more weight than what it says. It ships the Codex client as open source
under Apache 2.0. That client authorizes as a public client under the identifier
`app_EMoamEEZ73f0CkXaXp7hrann`. It proves each exchange with Proof Key for Code Exchange (PKCE)
hashed as `S256`. It hears the answer back at `http://localhost:1455/auth/callback`. Request for
Comments (RFC) 8252 prescribes that shape for native applications, because such a client holds no
secret it could keep. A registration resting on a public identifier can't tell one caller from
another.

The Codex login crate goes further. It takes the client identifier as an option its caller supplies,
and it honors an environment override. OpenAI built the flow for callers beyond the shipped binary.
CLIProxyAPI, this project's pinned reference for transports and sign-in, drives that same flow under
that same identifier.

Two reports sit against this reading. One client outside OpenAI met
`unsupported_country_region_territory` at the token endpoint. The official Codex succeeded from the
same machine. Another reported quota exhaustion on plan-backed calls the official client never hit.
Neither drew a maintainer answer. Something at OpenAI's edge can tell callers apart, and nothing
published says what it does with the difference.

ADR 0069's second reason still binds, and it needed an answer rather than an inheritance. Suppose
recompose and the Codex tool both hold a credential for one plan. Which one spends the refresh
token, and what keeps them from racing? OpenAI rotates the refresh token on renewal and refuses the
one before it. Losing that race signs a person out of their own tool.

## Decision

**recompose runs the Codex authorization flow itself.** This supersedes ADR 0069's rule that only
the tool signs in, for Codex alone. The flow is the one OpenAI ships. Each run mints a verifier,
sends its `S256` hash to `https://auth.openai.com/oauth/authorize`, and holds a listener on
127.0.0.1 at the port that client registered. The exchange at `https://auth.openai.com/oauth/token`
carries the verifier back. Nothing here runs Codex.

**Anthropic's prohibition stands as ADR 0069 wrote it.** Anthropic names the rule and polices it, so
Claude keeps one way in and the connect step keeps saying so. The vocabulary turns that into a
compiler question rather than a review note. One schema names the plans a browser redirect reaches.
Another names the plans a tool signs in. The plans reaching both ways are the computed intersection
of those two, so a plan offers two ways only by standing in both tables.

**No sign-in recompose runs shares a grant with anything else on the machine.** Three facts answer
the race, and a reader can check each one.

- **Separate grants.** The in-app exchange mints its own authorization, so OpenAI issues a refresh
  token bound to it. The token `codex login` wrote into `~/.codex/auth.json` is a different one.
  Rotating either leaves the other alone, because a rotation refuses only the token somebody already
  spent.
- **Separate homes.** The credential lands in the account's own directory under recompose's data
  folder. It takes the `auth.json` shape Codex writes, so every reader downstream stays as it was.
  This flow never reads, writes, or moves `~/.codex`.
- **One renewal owner per account.** An account records where it came from, and custody stamps that
  onto every grant. An account recompose signed in renews here. An account recompose adopted from
  the machine serves untouched, and nothing writes it back. Renewal inside recompose runs one
  refresh at a time per credential.

**Both ways in stay reachable, and each names the program that ends up holding the sign-in.** The
in-app row reads "Sign in through recompose" over "Opens your browser. recompose holds this
sign-in." The tool's own act keeps its place and names what it waits on. When Codex is missing, the
in-app row stays live and the tool's act names the install it wants. The step never again reads as
no way in.

## Consequences

**Good**: a ChatGPT plan connects on a machine carrying no Codex. The credential takes the shape the
rest of the code already reads. Standing, spending, renewal and the account row therefore needed no
change. Only the authorization half was missing, because the refresh half already ran against the
same client and the same endpoint. A type carries Anthropic's rule now, so no future plan picks up a
second way in by accident.

**Bad**: OpenAI stays silent rather than permissive. This record rests on structural evidence and a
maintainer's decision, not on a clause. Should OpenAI state a prohibition, this decision reverses
and the Codex row returns to one way in. The two unexplained reports above may be that prohibition
arriving without an announcement. recompose can't tell a policy refusal from a transient one at the
token endpoint.

The loopback port belongs to OpenAI rather than to this app. A Codex login already running holds it,
and the sign-in then refuses by naming the port. That refusal is honest, but it can't name who holds
the port.

One path still puts two programs on one grant, and a person has to choose it. The connect step
offers a line pointing a person's own Codex at whichever account recompose made current. Aim that
line at an account recompose signed in, and their Codex renews that grant too. Both programs
write the same file in place, and both read it fresh each turn. The two converge in every case but
true simultaneity. recompose renews five minutes ahead of expiry, and Codex renews only on a spent
turn. The loser of that overlap reads the winner's token on its next turn. The window is narrow
rather than closed. It's the price of the line that makes two programs agree on one account.

**Still standing from ADR 0069**: Anthropic's prohibition and everything resting on it. A
subscription account as a directory recompose owns. Custody following each platform's limit rather
than one mechanism everywhere. Park before place, pointer last. No schema holding a subscription
credential reference. And for an account adopted from the machine, only the tool owning that
credential ever refreshes it.

## Alternatives

**Leave ADR 0069 whole and tell people to install Codex.** Rejected. The feedback named that
behavior, and ADR 0069's reason for it belongs to Anthropic rather than OpenAI. Carrying one
vendor's prohibition to a vendor that never states it costs a person a plan they paid for.

**Trade the sign-in for a durable API key.** OpenAI's client can exchange the identity token for an
API key. That sits inside the sanctioned surface and needs none of the rotation machinery. Rejected
because it bills as API usage rather than against the plan. A person connecting a ChatGPT plan wants
that plan spent.

**Ship the device-code path instead of the loopback.** OpenAI runs one, and it sidesteps the pinned
port. Rejected for now, because it doesn't follow RFC 8628. It shows a code and then finishes
through the same verifier exchange. It wouldn't fit beside the plans sharing the device channel,
which share it because that specification fixes their whole exchange. It stays worth building as the
answer to an occupied port.

**Copy CLIProxyAPI's listener as it stands.** Rejected on three counts. It binds every interface
rather than the loopback address, which RFC 8252 warns against and which fails on Windows. Its scope
differs from the shipped client's. Its state carries 16 bytes where the official client carries
more. The flow is worth copying. The listener isn't.
