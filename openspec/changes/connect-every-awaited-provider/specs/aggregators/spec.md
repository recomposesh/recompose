## MODIFIED Requirements

### Requirement: OpenRouter connects as an aggregator key

The Aggregators catalog MUST offer six connectable entries: OpenRouter, Together AI, Fireworks AI, Groq, DeepInfra, and Cerebras. It MUST also offer a Custom aggregator entry. No entry MUST stand under a Soon badge, because every entry now connects.

A picked vendor MUST ask for a name and a key in the anatomy the API Keys destination ships, and the stored account MUST take the `aggregator` kind. The app MUST spend that key against the origin the provider directory names for the vendor, and MUST NOT ask a person for it.

A picked Custom aggregator MUST ask for a base URL and a dialect beside the name and the key, because the app knows neither. The stored account MUST carry both, and the app MUST spend the key against the address a person entered.

#### Scenario: a person connects a named aggregator

- Given the Aggregators catalog stands open
- When a person picks Groq and hands over a name and a key
- Then the account stands under the aggregator kind
- And the app spends it against the origin it holds for Groq
- And no part of the connect asks where Groq is

#### Scenario: a person connects a catalog the app never heard of

- Given the Aggregators catalog stands open
- When a person picks Custom aggregator
- Then the connect asks for a base URL and a dialect beside the name and the key
- And the stored account carries both
- And the app spends the key against the address a person entered

#### Scenario: no entry stands inert

- When a person opens the Aggregators catalog
- Then every entry answers a pointer and a keyboard
- And no Soon badge stands anywhere on the surface

### Requirement: An aggregator row claims no single host and offers no check

An aggregator reaches many models through one key, so a row MUST NOT name a single host and the surface MUST NOT offer a key check on it. A models probe answers about a catalog the vendor serves to anyone, so a successful answer says nothing about the key.

A Custom aggregator row MUST name the address a person gave it. The person chose that address, so naming it claims nothing about what the key reaches.

#### Scenario: a row for a named aggregator names no host

- When the Aggregators surface lists a connected account
- Then the row names the vendor and the tail of its key
- And the row offers no check

#### Scenario: a row for a custom aggregator names the address a person entered

- Given a connected Custom aggregator
- When the surface lists it
- Then the row names the address the person entered
- And the row still offers no check
