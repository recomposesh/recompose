## REMOVED Requirements

### Requirement: The catalog offers nine entries and connects two

**Reason**: The count in the name is the whole of what changed. Seven of the nine stood inert because the account row held no endpoint of its own, and it holds one now. The requirement that replaces this one keeps the catalog's shape, its one act, and the anatomy a connect asks for. The scenario about an inert entry goes with it, because no entry is inert.

## ADDED Requirements

### Requirement: The catalog offers nine entries and connects every one

The catalog the API Keys surface opens MUST offer nine entries: Anthropic API, OpenAI API, Gemini API, Mistral, xAI Grok, DeepSeek, Moonshot AI, Qwen, and Custom endpoint. Every one MUST connect, and no entry MUST stand under a Soon badge. The one act into the catalog MUST stand at the trailing edge of the window strip.

A picked vendor MUST spend its key against the origin the provider directory names, in the dialect the directory names, and the connect MUST ask for neither. A picked Custom endpoint MUST ask for a base URL and a dialect, because the app knows neither, and the stored account MUST carry both.

#### Scenario: a person opens the catalog from the API Keys surface

- When a person asks to add a provider
- Then the catalog opens over the surface, holding nine entries
- And every entry answers a pointer and a keyboard

#### Scenario: a person connects a vendor the app already places

- Given the catalog stands open
- When a person picks DeepSeek and hands over a name and a key
- Then the account stands under the api-key kind
- And the app spends it against the origin it holds for DeepSeek
- And the connect never asked for an address

#### Scenario: a person connects an endpoint of their own

- Given the catalog stands open
- When a person picks Custom endpoint
- Then the connect asks for a base URL and a dialect beside the name and the key
- And the stored account carries both
- And the app spends the key against the address a person entered

#### Scenario: an address no request could reach draws a refusal

- Given a person picked Custom endpoint
- When they enter something no request could reach
- Then the connect refuses and says so
- And nothing reaches storage

## MODIFIED Requirements

### Requirement: Verification answers a question and keeps no answer

A Verify act MUST let a person ask whether a stored key still authenticates, and it MUST NOT gate storing. The answer MUST be one of three: the key authenticates, the provider didn't accept the key, or the check couldn't run. The wording MUST speak as of the check, MUST NOT claim the account can spend, and MUST stay recompose's own rather than the provider's. The app MUST NOT store the answer: it lives only while the screen shows it, so no row carries a stale claim. The check MUST NOT hold the surface: it runs as an asynchronous act, and a timeout or a transport failure folds to the could-not-check verdict.

The check MUST stand on every key whose vendor the provider directory names both a credential header and a models path for. A key under a vendor the directory names neither for MUST offer no check, because a check that can't succeed teaches nothing. That covers a key stored against an endpoint a person entered themselves, since no directory row places it.

#### Scenario: a key passes the check

- Given a stored key the provider accepts
- When a person runs Verify
- Then the surface reports that the key authenticates as of the check
- And nothing claims the account can spend

#### Scenario: the provider turns the key away

- Given a stored key the provider no longer accepts
- When a person runs Verify
- Then the surface reports that the provider didn't accept the key
- And the report never guesses between a typo, a revocation, and an expiry

#### Scenario: the check can't run

- Given a provider the check can't reach
- When a person runs Verify
- Then the surface reports that the check couldn't run
- And the row reads unverified rather than broken

#### Scenario: no answer outlives the screen

- Given a verification answer on screen
- When a person leaves the surface and returns
- Then no row carries the earlier answer

#### Scenario: a check stands on a vendor the app can ask

- Given a connected Mistral key
- When the surface lists it
- Then the row offers a check

#### Scenario: a check stands on none the app can't ask

- Given a connected key under an endpoint a person entered themselves
- When the surface lists it
- Then the row offers no check
