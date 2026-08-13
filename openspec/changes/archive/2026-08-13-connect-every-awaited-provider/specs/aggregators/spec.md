## REMOVED Requirements

### Requirement: OpenRouter connects as an aggregator key

**Reason**: The name says one vendor connects, and six do. Five stood inert for want of an origin the app could spend against, and the provider directory names one for each. The requirement that replaces this one keeps the anatomy a connect asks for and the `aggregator` kind the account takes, and adds the address a person may name themselves.

## ADDED Requirements

### Requirement: The catalog connects six aggregators and an address of one's own

The Aggregators catalog MUST offer six connectable entries: OpenRouter, Together AI, Fireworks AI, Groq, DeepInfra, and Cerebras. It MUST also offer a Custom aggregator entry. No entry MUST stand under a Soon badge, because every entry now connects.

A picked vendor MUST ask for a name and a key in the anatomy the API Keys destination ships, and the stored account MUST take the `aggregator` kind. The app MUST spend that key against the origin the provider directory names for the vendor, and MUST NOT ask a person for it.

A picked Custom aggregator MUST ask for a base URL and a dialect beside the name and the key, because the app knows neither. The stored account MUST carry both, and the app MUST spend the key against the address a person entered.

#### Scenario: a person connects an OpenRouter key

- When a person picks OpenRouter in the catalog the Aggregators surface opened
- Then the form asks for a name and a key, and nothing more
- And the connected account lists under the Aggregators surface

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

## MODIFIED Requirements

### Requirement: An aggregator row claims no single host and offers no check

An aggregator row MUST read in the two-line key anatomy: the product title, then the name beside the masked tail. The row MUST NOT offer a Verify act, whatever the provider directory holds for the vendor. A models probe answers about a catalog the vendor serves to anyone, never about the key. The credential-scoped endpoint's spend answer found its surface. The usage screen reads OpenRouter credits as a stamped balance, and the row carries a usage summary that deep-links into it.

A Custom aggregator row MUST name the address a person gave it. The person chose that address, so naming it claims nothing about what the key reaches.

#### Scenario: a connected aggregator reads as a key without a check

- When the surface lists a connected OpenRouter account
- Then the row reads the product over the name and the mask
- And no Verify act stands anywhere on or behind the row

#### Scenario: the credits answer reads on the usage screen

- Given a connected OpenRouter account that has served requests
- When the person follows the row's usage summary
- Then the usage screen opens scoped to the account
- And the credits card prints the balance beside the instant of the reading

#### Scenario: a row for a named aggregator names no host

- When the Aggregators surface lists a connected Groq account
- Then the row names the vendor and the tail of its key
- And the row offers no check

#### Scenario: a row for a custom aggregator names the address a person entered

- Given a connected Custom aggregator
- When the surface lists it
- Then the row names the address the person entered
- And the row still offers no check
