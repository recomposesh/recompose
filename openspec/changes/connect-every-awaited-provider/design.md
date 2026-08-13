# Design

## The one seam

Five tables answer questions about a provider today, and they disagree about which providers
exist.

| Table                    | Home                                                   | Answers                      |
| ------------------------ | ------------------------------------------------------ | ---------------------------- |
| `servingOrigins`         | `apps/desktop/src/main/engine-host/provider-origin.ts` | where a turn goes            |
| `CREDENTIALED_DIALECTS`  | `packages/engine/src/provider/credentialed-target.ts`  | how a turn reads on the wire |
| `providerPath`           | the same module                                        | what path a turn lands on    |
| `HEADER_BUILDERS`        | the same module                                        | which header carries the key |
| `firstPartyProbeOrigins` | `packages/engine/src/provider/key-probe.ts`            | where a check asks           |

A sixth and seventh live in the renderer as `keyHosts` and `keyShapeHints`, and an eighth is
the `keyProviderIdSchema` enum that decides whether a check may run at all.

Every one of them is the same knowledge: what recompose knows about a vendor. Adding twelve
vendors by widening eight tables would spread one fact across eight files and let them drift.

So the fact moves to one place. `packages/contracts/src/provider-directory.ts` names, per
vendor, the serving origin, the dialect, the turn path, the credential header scheme, the
models path and the documented key opening. Contracts is already where both processes read
`subscriptionProviders` and `localRuntimes` from, so this is the shape the codebase already
uses for exactly this kind of knowledge rather than a new pattern.

The tables above become readers of it. None of them keeps a copy.

## What a stored row carries

A credentialed account records a provider name. Where the directory names that provider, the
directory answers every question about it. Where it doesn't, the row must answer, so the row
grows the field it lacked:

```
endpoint?: { origin: string; dialect: ProviderDialect }
```

Absent on every account stored today, and absent on every account a person connects through a
named vendor. Present only on a custom row, because only a person filling in an address has
an address to store. Accounts version 9 carries the field, and its migration mints nothing.
A row that predates the field reads its endpoint from the directory exactly as it did.

`providerOriginOf` therefore reads: the row's own endpoint, else the directory, else the
plugin scheme it already falls back to.

## Why a custom row asks for a dialect and a named vendor never does

Groq speaks Chat Completions. That's a fact about Groq, and the directory holds it. Asking a
person to choose it would ask them to be right about something recompose knows. A wrong
answer would then fail at the first turn, with nothing on screen explaining why.

A custom endpoint is the opposite case. recompose knows nothing about the address, so the
person is the only source, and the form requires the field rather than guessing it. The form
offers the three dialects the gateway already speaks: Anthropic, Chat Completions, and
Responses.

## The local look

`probeRuntime` asks `/api/version` today, which is Ollama's path. A shared path would go
wrong in both directions. `/v1/models` answers on every OpenAI-compatible server, so vLLM on
port 1234 would report as LM Studio. `/api/version` answers on none of the three new
runtimes, so all three would report as absent while running.

Each runtime therefore names its own identity path and where the version sits in the answer:

| Runtime    | Path             | Version        |
| ---------- | ---------------- | -------------- |
| `ollama`   | `/api/version`   | `version`      |
| `lmstudio` | `/api/v0/models` | none published |
| `llamacpp` | `/props`         | `build_info`   |
| `vllm`     | `/version`       | `version`      |
| `custom`   | `/v1/models`     | none published |

LM Studio publishes no version. The reachability contract's `answers` arm therefore carries
the version only when one arrives, and the surface prints the version line only when it has
one. The alternative is inventing a version, and the surface would then print a lie.

A look at a custom local server asks `/v1/models`. A person who typed an address chose what
listens there, so recompose has no identity to hold it to.

## The two sign-ins

**Kimi Code** is a row in `subscriptionProviders`. CLIProxyAPI owns the device flow, ships it
tested under `internal/auth/kimi/`, and accepts `--kimi-login` beside the
`--antigravity-login` recompose already runs against the same config home. Nothing else has
to change, and porting the flow would leave a second copy of something the tool recompose
launches already does.

**GitHub Copilot** has no such owner, so the flow lands in the app. It follows CC Switch's
shipped implementation:

1. `POST https://github.com/login/device/code` with the Visual Studio Code client identity
   returns a device code, a user code, a verification address and a poll interval.
2. The surface shows the person the user code and the address, and recompose polls
   `https://github.com/login/oauth/access_token` at the interval the server named, backing
   off when it answers `slow_down` and stopping when it answers a terminal refusal.
3. The GitHub token buys a Copilot token from
   `https://api.github.com/copilot_internal/v2/token`, which carries its own expiry.
4. The signed-in login comes from `https://api.github.com/user`, so the row names who signed
   in rather than standing anonymous.

The Copilot token is short-lived and the GitHub token isn't. So the vault holds the GitHub
token, and recompose buys the Copilot token again a minute before it lapses. That margin comes
from CC Switch, and it exists because a token expiring mid-turn fails a request a person is
watching.

## The coding plans

A plan token is a secret a person pastes against a documented origin speaking the Anthropic
dialect. That's precisely what a key account already is, so the three plans store as keys and
gain no machinery.

They stand in the Subscriptions catalog because that's where a person who bought a plan
looks. The catalog already separates the column a row appears in from the kind it stores as:
`keyKindOf` maps an offer's way to a stored kind, and it keeps doing so. The offer's way
becomes the kind the row stores under, and the column it appears in is the surface that
opened the catalog.

A connected plan therefore appears on the API Keys surface. That's the honest reading. The
row holds a secret recompose spends, so it stands with the other rows holding secrets
recompose spends.

## What the check can now answer

`checkableKey` refuses any provider outside a four-member enum, because `authHeadersFor`
throws on anything else. With the directory holding a credential header and a models path per
vendor, the refusal has no reason left: a check may run wherever the directory names both.

An aggregator still offers no check. That rule stands on its own recorded reason. An
aggregator's models list describes a catalog the vendor serves to anyone, so a successful
answer says nothing about the key.
