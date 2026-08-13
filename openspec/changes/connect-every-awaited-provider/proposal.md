## Why

Four catalogs stand in recompose, and twenty-two rows across them carry a Soon badge. A
person opens the API Keys catalog, reads nine products, and can connect two. The other seven
say what they wait on: a base URL and a dialect.

That line is the whole story. The account row holds a provider name and a secret. It holds
nowhere to send the turn, and nothing to say how the turn reads on the wire. Both facts live in
closed tables the code carries, one per process, keyed by a provider identity that only ever
grew when a feature grew with it.

So the badge isn't a roadmap. It's a schema limit written as product copy, repeated
twenty-two times.

Nothing about twenty of them is hard. Five aggregators speak Chat Completions against a
documented origin. Six key providers do the same, and two of them already carry an origin, a
dialect and a credential header in the engine without ever standing in a catalog. Three local
runtimes answer on a documented port. Three coding plans speak the Anthropic dialect against
a plan token. Three escape hatches wait only on a field the row can't hold.

The two that sign in are the exception, and they wait on a contract this change leaves alone.

The badge outlived its reason. This change removes it.

## What changes

Every row a person can see becomes a row a person can connect. After this change no catalog
holds a Soon badge, and `awaitedFor` leaves the codebase with the module that held it.

An account row learns where it spends itself. Today one table turns a stored provider name
into an origin, and a second table turns it into a dialect. Those two tables become one, and
they move to the contracts both processes already share. A row whose provider the table
doesn't name carries its own origin and dialect instead.

That one field is what the escape hatches stand on. A custom endpoint, a custom aggregator
and a custom local server each ask a person for the address and the dialect, and each stores
the answer.

A look at a local runtime asks that runtime's own path. Ollama answers `/api/version`,
llama.cpp answers `/props`, vLLM answers `/version`, and LM Studio answers a model list
under a path only LM Studio serves. A runtime that publishes no version still reports that
it answers, because a version it never had isn't a reason to call it absent.

Three coding plans hand over a token. Qwen's sign-in ended in April 2026, and Z.ai and
MiniMax never published one. Each keeps its place in the Subscriptions catalog, because
that's where a person who bought a plan looks. Each stores as a key, because a pasted token
is what a key account already holds.

Two rows wait, and they're the two that sign in. Kimi Code and GitHub Copilot both need
`SubscriptionProviderId` to admit a fourth and a fifth member, and that enum reaches through
the engine's whole subscription runtime. That runtime serves neither of them: Kimi
already serves through the credentialed path, and Copilot would. Widening the enum to reach a sign-in
would drag a transport neither one uses. Both therefore land in their own change, and neither
stands under a Soon badge in the meantime, because a badge is what this change removes.

## Locked decisions

1. **One table names every vendor endpoint, and it lives in contracts.** The origin, the
   dialect, the turn path, the credential header and the models path stand together, beside
   `subscriptionProviders` and `localRuntimes`, which already work this way. Neither process
   keeps a private copy.
2. **A stored account may carry its own endpoint.** Where the table names the provider, the
   table answers. Where it doesn't, the row answers, and only a row a person filled in
   themselves ever does. This needs a version bump and a migration, and every account stored
   today reads its endpoint from the table.
3. **A custom row is the only row that asks for a dialect.** A vendor recompose names knows
   its own dialect, and asking a person to pick one for Groq would be asking them to be
   right about something the table already knows.
4. **A look asks the runtime's own path.** A shared path would make any OpenAI-compatible
   server on the port read as the runtime a person picked.
5. **A runtime that answers without naming a version still answers.** LM Studio publishes no
   version, so the reachability contract carries the version only when the runtime gives one.
6. **A field hints a key shape only where the vendor documents an opening.** Three vendors do.
   The rest leave the field unhinted rather than teaching a shape nobody promised.
7. **The two plans that sign in wait for their own change.** Both need a wider
   `SubscriptionProviderId`, and that enum reaches the engine's subscription runtime, which
   serves neither of them. The research that placed both stands in `discovery/`.
8. **A coding plan stands in the Subscriptions catalog and stores as a key.** The catalog
   column is where a person looks. The stored kind is what the credential is. Bending the
   subscription contract around a token that never renews would put a "this one has no tool"
   branch through sign-in launch, tool presence, config homes, custody and delegated renewal.
9. **The probe speaks to every provider it has a credential header for.** The check act
   stops being an Anthropic and OpenAI privilege, because the header and the models path
   now stand in the table beside the origin.

## Capabilities

### New capabilities

- **Connecting every provider the catalog names.** Twenty rows that stood inert connect, each
  against the endpoint its vendor documents.
- **An account pointed at an address a person chose.** A custom endpoint, a custom aggregator
  and a custom local server each carry the origin and dialect that person entered.

### Modified capabilities

- **The four catalogs.** Every entry connects, and the Soon badge leaves the product.
- **A look at a local runtime.** It asks the runtime's own path and tolerates a runtime that
  names no version.
- **The key check.** It answers for every provider the table gives a credential header.
