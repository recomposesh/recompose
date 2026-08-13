## ADDED Requirements

### Requirement: Kimi Code signs in through the tool that owns its flow

Kimi Code authenticates through a device authorization grant, and CLIProxyAPI implements that
whole flow. recompose already runs that tool for another plan. The app MUST therefore delegate
this sign-in to it rather than keeping a second copy of an authorization to maintain.

The app MUST spend the resulting account against the endpoint the provider directory names for
Kimi, which is the endpoint the engine already serves.

#### Scenario: a person signs in to Kimi Code

- Given the Subscriptions catalog stands open
- When a person picks Kimi Code
- Then the sign-in stands alone, and the tool that owns the flow runs it

#### Scenario: the tool that owns the flow is the one already installed

- When the surface reports which tools this machine can run
- Then Kimi Code names the same tool the Gemini plan names

### Requirement: A plan that issues a token connects by taking one

Three coding plans sell a monthly subscription and offer no sign-in: the GLM Coding Plan, the Qwen Coding Plan, and the MiniMax Coding Plan. Qwen ended its sign-in in April 2026, and the other two never published one.

The Subscriptions catalog MUST offer all three, because that's where a person who bought a plan looks for it. Picking one MUST ask for a name and the token the plan issued, in the anatomy the API Keys destination ships.

The app MUST store such an account under the `api-key` kind, because a pasted token is what a key account already holds. The connected row MUST therefore stand on the API Keys surface. The app MUST spend the token against the origin the provider directory names for that plan, in the Anthropic dialect those plans speak.

The app MUST NOT run a sign-in, look for a tool, create a config home, or renew the token for such an account. None of those exist for a token a person pasted.

#### Scenario: a person connects a plan that issued them a token

- Given the Subscriptions catalog stands open
- When a person picks the GLM Coding Plan and hands over a name and its token
- Then the account stands under the api-key kind
- And the app spends it against the origin it holds for that plan

#### Scenario: the connected plan stands where its secret does

- Given a connected GLM Coding Plan
- When a person opens the API Keys surface
- Then the row stands there among the other accounts holding a secret

#### Scenario: nothing renews a token a person pasted

- Given a connected plan account
- When time passes
- Then the app requests no renewal for it
- And it looks for no tool on the machine

## MODIFIED Requirements

### Requirement: Adding a provider opens the catalog

The Subscriptions surface MUST open a catalog holding Claude, Codex, Kimi Code, the GLM Coding Plan, the Qwen Coding Plan, and the MiniMax Coding Plan. No entry MUST stand under a Soon badge. The one act into the catalog MUST stand at the trailing edge of the window strip.

#### Scenario: a person opens the subscriptions catalog

- When a person opens the catalog from the Subscriptions surface
- Then it lists six plans
- And every entry answers a pointer and a keyboard

### Requirement: Picking a provider offers the one way the surface holds

The surface opens the catalog for one kind, so a picked provider MUST offer only that kind's way of connecting. A plan the provider's own tool signs into MUST hand the sign-in to that tool and MUST NOT offer a key beside it. A plan that issues a token instead MUST ask for a name and that token, and MUST NOT offer a sign-in beside it, because none exists to offer.

#### Scenario: a plan with a sign-in offers the sign-in alone

- When a person picks Kimi Code
- Then the sign-in stands alone, yielding an account for the provider's own tool

#### Scenario: a plan with no sign-in offers the token alone

- When a person picks the MiniMax Coding Plan
- Then the connect asks for a name and a token
- And it offers no sign-in
