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

### Requirement: GitHub Copilot signs in through a device flow the app runs

The Subscriptions catalog MUST offer GitHub Copilot. Nothing on the machine owns its sign-in, so
the app MUST run the device authorization itself.

The app MUST show the person the code and the address to enter it at, and MUST poll for
authorization at the pace the server sets. It MUST wait longer when the server asks it to, and
MUST stop on a refusal the server calls terminal rather than polling on. The handle that completes
the flow MUST NOT cross to the screen, so nothing outside the main process can finish a sign-in it
never opened.

On authorization the app MUST record who signed in, so the row names an account. The app MUST hold
the long-lived credential the sign-in yielded, and MUST buy the short-lived one a turn carries. It
MUST buy the next one before the current one lapses, because a credential expiring part way
through fails a request a person is watching.

#### Scenario: a person signs in to Copilot

- Given the Subscriptions catalog stands open
- When a person picks GitHub Copilot
- Then the surface shows a code and the address to enter it at
- And authorizing there records the account under the name that signed in

#### Scenario: the flow waits at the pace the server sets

- Given a sign-in stands waiting for authorization
- When the server asks the app to slow down
- Then the app waits longer between asks

#### Scenario: a refused sign-in stops rather than polls on

- Given a sign-in stands waiting for authorization
- When the person denies it, or the code expires
- Then the app stops asking and says which happened

#### Scenario: a turn carries what the held credential buys

- Given a connected Copilot account
- When a gateway serves a turn through it
- Then the turn carries the short-lived credential rather than the one the vault holds

#### Scenario: nothing asks a tool about the plan no tool signs in

- When the surface reports which tools this machine can run
- Then GitHub Copilot names none, because recompose runs its flow itself

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

The Subscriptions surface MUST open a catalog holding Claude, Codex, GitHub Copilot, Kimi Code, the GLM Coding Plan, the Qwen Coding Plan, and the MiniMax Coding Plan. No entry MUST stand under a Soon badge. The one act into the catalog MUST stand at the trailing edge of the window strip.

#### Scenario: a person opens the subscriptions catalog

- When a person opens the catalog from the Subscriptions surface
- Then it lists seven plans
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
