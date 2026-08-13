## MODIFIED Requirements

### Requirement: The catalog offers nine entries and connects two

The catalog the API Keys surface opens MUST offer nine entries, and every one of them MUST connect. The nine are Anthropic API, OpenAI API, Gemini API, Mistral, xAI Grok, DeepSeek, Moonshot AI, Qwen, and Custom endpoint. No entry MUST stand under a Soon badge. The one act into the catalog MUST stand at the trailing edge of the window strip.

A picked vendor MUST spend its key against the origin the provider directory names, in the dialect the directory names, and the connect MUST ask for neither. A picked Custom endpoint MUST ask for a base URL and a dialect, because the app knows neither, and the stored account MUST carry both.

#### Scenario: a person opens the catalog from the API Keys surface

- When a person opens the catalog from the API Keys surface
- Then it lists nine entries
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

### Requirement: Verification answers a question and keeps no answer

The surface MUST offer a check on every key whose vendor the provider directory names a credential header and a models path for. Running the check MUST stay the person's choice, and the app MUST NOT store its answer.

A key under a vendor the directory names neither for MUST offer no check, because a check that can't succeed teaches nothing. An aggregator MUST offer no check whatever the directory holds, because its models list describes a catalog the vendor serves to anyone.

#### Scenario: a check stands on a vendor the app can ask

- Given a connected Mistral key
- When the surface lists it
- Then the row offers a check

#### Scenario: a check stands on none the app can't ask

- Given a connected key under an endpoint a person entered themselves
- When the surface lists it
- Then the row offers no check

#### Scenario: the answer leaves with the screen

- Given a person ran a check
- When they leave the surface and return
- Then the row reports no verdict from before
