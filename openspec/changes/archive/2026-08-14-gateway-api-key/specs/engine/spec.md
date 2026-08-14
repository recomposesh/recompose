## ADDED Requirements

### Requirement: A gateway that requires a key answers only the caller carrying it

While a gateway requires an API key, its listener MUST refuse every request that arrives without that
key. The refusal MUST arrive before the request reaches a virtual model, a provider, or the traffic
ledger. The listener MUST accept the key in any of the four fields its dialects use. Those fields are
the `Authorization` header, with or without a `Bearer` prefix, the `x-api-key` header, the
`x-goog-api-key` header, and the `key` query parameter. A request presenting more than one candidate
MUST pass when any single candidate matches. The comparison MUST take the same time whatever the
number of leading characters that match.

A gateway that requires no key MUST answer exactly as it answers today. That covers a gateway holding
no key at all and a gateway holding one it no longer requires, and the listener MUST NOT tell the two
apart.

#### Scenario: a request arrives without a key

- When a gateway requires an API key and a request arrives carrying none
- Then the listener answers 401 with a typed refusal naming the gateway
- And the answer carries a `WWW-Authenticate` challenge
- And the request reaches no virtual model and no provider

#### Scenario: a request carries the wrong key

- When a gateway requires an API key and a request arrives carrying a different value
- Then the listener answers 401 with a typed refusal

#### Scenario: a client carries the key in its own dialect's field

- When a gateway requires an API key
- And a request presents it in the `Authorization` header, the `x-api-key` header, the
  `x-goog-api-key` header, or the `key` query parameter
- Then the listener serves the request

#### Scenario: a client fills one field with a placeholder and another with the key

- When a gateway requires an API key
- And a request presents a value that misses in one accepted field and the key in another
- Then the listener serves the request

#### Scenario: a gateway requires no key

- When a gateway requires no API key and a request arrives carrying none
- Then the listener serves the request

#### Scenario: a gateway holds a key it no longer requires

- When a gateway holds an API key with its requirement off
- And a request arrives carrying no key
- Then the listener serves the request

### Requirement: The health paths answer without a key

Each gateway MUST answer its health paths whether it requires an API key or not, because a health path
that needs a credential can't prove the listener answers. Every other path the gateway serves MUST
sit behind the key, the management paths and the WebSocket paths included.

#### Scenario: a health check reaches a gateway requiring a key

- When a gateway requires an API key and a request arrives at a health path carrying no key
- Then the listener answers with the success it gives a gateway requiring none

#### Scenario: a client asks a management path without a key

- When a gateway requires an API key and a request arrives at a management path carrying no key
- Then the listener answers 401 with a typed refusal
