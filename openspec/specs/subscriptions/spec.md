# subscriptions

## Purpose

The behavioral contract of a subscription account in recompose. It covers what connecting one does, what it never does, how the app lists one, what a row reports, and how a person adds another. A subscription is an account a person already pays a plan for, signed in through the provider's own tool. A gateway serves one through a virtual model, and that serving contract lives in the virtual-models spec.

## Requirements

### Requirement: A subscription is a managed account that stands as a gateway target

Connecting a subscription MUST record the account as a managed account. A connected subscription MUST stand among the targets a virtual model can bind, like every other stored account kind. Its credential MUST stay in the app's custody on the way to a target's provider. It resolves per request and rides neither a command line, an environment variable, nor a disk file.

#### Scenario: a person reads what a subscription account serves

- When the subscriptions surface lists a connected account
- Then the row names the plan product the account signs into

#### Scenario: a gateway offers a subscription among its targets

- Given a connected subscription account
- When a person composes a virtual model
- Then the subscription account stands among the targets offered

### Requirement: The provider's own tool performs the sign-in

The app MUST delegate signing in to the provider's own command-line tool rather than running an authorization flow of its own.

Renewal ownership follows where the account came from. An account the app signed in lives in a config home the app created, which no other program reads, so the app MUST renew that credential itself. An account the app adopted from the machine belongs to the tool that wrote it as well, so the app MUST NOT renew it. It MUST hand that renewal over, as the adopted-credential requirement sets out.

A config home the app hands to the provider's tool for a sign-in MUST arrive prepared, so the tool doesn't treat the run as a first run. A person signing in answers the provider's sign-in and nothing else.

#### Scenario: a person connects a subscription

- When a person chooses to sign in for a provider that offers it
- Then the app hands the sign-in to that provider's own tool
- And the account appears once that tool reports success

#### Scenario: the provider's tool is absent

- Given the provider's command-line tool isn't installed
- When a person chooses to sign in for that provider
- Then the surface names the missing tool and what to do about it
- And no sign-in begins

#### Scenario: a person signs in with a different account

- When a person chooses to sign in rather than adopt what the machine holds
- Then the tool asks only what it needs to sign in
- And it skips the questions it asks on a first run

#### Scenario: the app renews an account it signed in

- Given a connected account the app signed in
- And its credential nears expiry
- When a request needs that account
- Then the app renews the credential itself

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

### Requirement: One address stands as one account

A sign-in that lands an address the app already holds for that provider MUST write over that account rather than record a second one. The check runs on return, because the tool only names the address once the sign-in finishes. A sign-in that names nobody MUST stand as its own account.

#### Scenario: a person signs the same address in again

- Given a connected account signed in as an address
- When a sign-in for the same provider lands the same address
- Then the surface lists one account for that address
- And the account stands connected and active

### Requirement: The empty state says what a subscription is

With no subscription connected, the surface MUST present a single call to action alongside a sentence naming what a subscription account is, rather than an empty list.

#### Scenario: a person opens the surface with nothing connected

- When the subscriptions surface loads and no subscription exists
- Then the surface shows the call to action and its explanation
- And no account list renders

### Requirement: A row reports the account and where it stands

A row MUST carry the provider's mark, the plan product's name, and the plan the account holds. It MUST also carry the address it signs in as, its standing, and where the account came from. The identity MUST hold two lines, the product with its plan and the address, and nothing more. Standing MUST read as a word with a mark beside it rather than as color alone.

Where the account came from MUST read on the row, because it decides both what the row's own act does and whether the app touches the credential.

Where a row reads its standing MUST follow where its account came from. An adopted account keeps nothing in a home of the app's. The app MUST read its standing from the store the provider's own tool writes, which is the same reading a serving turn takes. Reading a home an adopted account never had would report every such row lapsed.

#### Scenario: a connected account reads as connected

- When the surface lists an account whose authorization holds
- Then the row reports it as connected
- And the report carries a mark beside the word

#### Scenario: a person tells an adopted account from a signed-in one

- Given one account the app adopted from the machine and one the app signed in
- When the surface lists them
- Then each row reports where its account came from

### Requirement: A lapsed account carries its own way back

An account whose authorization lapsed MUST report that on its own row and MUST offer the way back on that row. The app MUST NOT report a lapse only as a banner over the list, and MUST NOT leave a lapsed account looking connected.

The way back follows where the account came from. An account the app signed in MUST offer to sign in again. An account the app adopted MUST NOT offer that, because signing in reaches a different account than the one it adopted. It MUST name the person's own tool to open instead.

#### Scenario: an account loses its authorization

- Given a connected account whose authorization lapsed
- When the subscriptions surface lists it
- Then the row reports the lapse rather than reporting it as connected
- And the row offers the way to restore the account

#### Scenario: an account the app signed in loses its authorization

- Given a connected account the app signed in whose authorization lapsed
- When the subscriptions surface lists it
- Then the row reports the lapse rather than reporting it as connected
- And the row offers to sign the account in again

#### Scenario: an account the app adopted loses its authorization

- Given a connected account the app adopted from the machine whose authorization lapsed
- When the subscriptions surface lists it
- Then the row reports the lapse rather than reporting it as connected
- And the row names the person's own tool to open
- And the row offers no sign-in

### Requirement: Adding a provider opens the catalog

The way to another account MUST stand once, at the trailing edge of the window strip. It MUST open a catalog over the surface, holding only the kind that surface holds. Each entry MUST name the plan product and what connecting it gives.

The Subscriptions catalog MUST hold Claude, Codex, GitHub Copilot, Kimi Code, the GLM Coding Plan, the Qwen Coding Plan, and the MiniMax Coding Plan. No entry MUST stand under a Soon badge, because every one of the seven connects.

#### Scenario: a person opens the catalog from the subscriptions surface

- When a person asks to add a provider
- Then the catalog opens over the surface, holding only subscription plans
- And it lists seven of them
- And every entry answers a pointer and a keyboard

### Requirement: Picking a provider offers the one way the surface holds

The surface opens the catalog for one kind, so a picked provider MUST offer only that kind's way of connecting. A subscription pick MUST hand the sign-in to the provider's own tool and MUST NOT offer a key beside it. A key pick MUST ask for a name and a key, because the provider rides in from the picked entry.

A subscription pick MUST lead with the account the machine already holds, when it holds one. The sign-in MUST stay reachable as the quieter act rather than as the first thing a person meets. While either act runs, the other MUST stand inert rather than disappear, so the surface doesn't resize under the person's hand.

A plan that issues a token instead of a sign-in MUST ask for a name and that token. It MUST NOT offer a sign-in beside it, because none exists to offer.

#### Scenario: a person picks a provider from the subscriptions catalog

- When a person picks "anthropic" in the catalog the subscriptions surface opened
- Then the sign-in stands alone, yielding an account for the provider's own tool
- And the surface asks for no key

#### Scenario: a person picks a provider whose account sits on the machine

- Given the provider's own tool signed in on this machine
- When a person picks that provider in the subscriptions catalog
- Then the account it holds leads the step
- And the sign-in stands beneath it as the quieter act

#### Scenario: a person waits while an act runs

- Given a person picked a provider whose account sits on the machine
- When one of the two acts runs
- Then the other act stands inert
- And it keeps its place on the step

#### Scenario: a plan with a sign-in offers the sign-in alone

- When a person picks Kimi Code
- Then the sign-in stands alone, yielding an account for the provider's own tool

#### Scenario: a plan with no sign-in offers the token alone

- When a person picks the MiniMax Coding Plan
- Then the connect asks for a name and a token
- And it offers no sign-in

### Requirement: A credential already on the machine can become an account

The app MUST report, per provider, whether the machine already holds a credential that provider's own tool wrote. It MUST offer that credential as a way to connect without a sign-in.

That report MUST name the address and the plan, and MUST carry no credential material. Only a person's act to connect MAY read the material, because reading it can ask the operating system for permission. A permission prompt belongs to something the person did. The report MUST NOT run again on every mount of the surface that shows it.

Adopting MUST record a managed account the same way a sign-in does, and that account MUST stand among a virtual model's targets like any other. The app MUST record that the account came from the machine, because both the remedy the row offers and the renewal owner follow that fact.

#### Scenario: a person connects the account already on the machine

- Given the provider's own tool signed in on this machine
- When a person chooses to connect that provider
- Then the surface names the address and the plan it holds
- And connecting it records the account with no sign-in

#### Scenario: nothing on the machine to adopt

- Given the provider's own tool signed in nowhere on this machine
- When a person chooses to connect that provider
- Then the surface names that and offers the sign-in

#### Scenario: the provider's tool isn't installed

- Given the provider's command-line tool isn't installed
- When a person chooses to connect that provider
- Then the surface names the missing tool and what to do about it
- And it offers nothing to adopt, because a tool that never ran left nothing

#### Scenario: the credential store refuses to open

- Given the operating system refuses to open the credential store
- When a person chooses to connect that provider
- Then the surface says the operating system refused
- And it doesn't claim the machine holds nothing
- And it offers a way to ask again

The app MUST decide a record's moment from the token it spends on a turn. A record MAY carry a second token that names the account and lapses on a schedule of its own, and reading that one instead would report a working account lapsed.

The app MUST look wherever the provider's own tool keeps its record. One vendor writes a file on one machine and the operating system's keyring on another. Two stores holding the same account MAY disagree. The later moment MUST win, because the owning tool already rotated past the earlier one.

#### Scenario: what the machine holds carries no account

- Given the machine holds a record for the provider that carries no account credential
- When the app reports what it holds
- Then it offers nothing to adopt

#### Scenario: a record whose account name lapsed before the token it spends

- Given the machine holds a record whose naming token lapsed and whose spent token holds
- When the app reports what it holds
- Then it reports the account as connected

#### Scenario: the record sits in the keyring rather than a file

- Given the provider's own tool keeps its record in the operating system keyring
- When the app reports what it holds
- Then it finds the account rather than reading the machine as empty

### Requirement: The app never renews a credential it adopted

An adopted credential belongs to the tool that wrote it as much as to the app. Both providers spend the refresh token on every renewal, so a second renewer signs the person out of their own tool. The app MUST NOT request a renewal for an adopted credential.

The app MUST read the live store on each serving turn rather than serve a copy it kept, because the owning tool rotates the credential without telling the app.

The app MUST keep no copy of an adopted credential anywhere of its own, whatever the reason for writing one. A provider MAY want facts in the credential that the record on the machine carries none of, and the app MAY mint them for the turn it serves. Writing that credential back is only the app's to do for a home it owns alone.

#### Scenario: serving an adopted account leaves nothing behind

- Given a connected account the app adopted from the machine
- When a request needs that account
- Then the app holds no credential of its own for that account afterward

When an adopted credential nears expiry, the app MUST hand the renewal to the provider's own tool. That run MUST carry no window, and a lock MUST admit one renewal at a time.

A tool that renews only by spending a turn names no run, because a background refresh MUST NOT cost a person a turn. The app MUST read that answer apart from a run that failed, and MUST spawn nothing for it.

A delegated renewal that can't run MUST leave the credential as it stands and MUST report the account lapsed once its moment passes. A failed renewal MUST NOT delete a credential.

#### Scenario: an adopted credential nears expiry

- Given a connected account the app adopted from the machine
- And its credential nears expiry
- When a request needs that account
- Then the app runs the provider's own tool to renew it
- And the app serves the request with what the store holds afterward

#### Scenario: the owning tool renewed the credential elsewhere

- Given a connected account the app adopted from the machine
- And the provider's own tool renewed the credential since the last request
- When a request needs that account
- Then the app serves the renewed credential and asks for no sign-in

#### Scenario: two requests arrive on an expiring adopted credential

- Given a connected account the app adopted from the machine whose credential nears expiry
- When two requests need that account at once
- Then one renewal runs
- And the app serves both requests

#### Scenario: the owning tool has gone

- Given a connected account the app adopted from the machine
- And nobody has the provider's command-line tool installed any longer
- When its credential expires
- Then the account reports itself lapsed
- And the credential stands as it was

### Requirement: A sign-in leaves the person's own login alone

The provider's tool keeps a separate credential per config home. A sign-in the app runs happens in a home the app created, so the app MUST address the credential belonging to that home. It MUST NOT read, overwrite, or remove the credential belonging to the home the person's own tool uses.

A read MUST tolerate a provider version that keeps one credential for every home, so it falls back to that credential when the home's own is absent.

#### Scenario: a sign-in runs while the machine holds its own login

- Given the person's own tool signed in on this machine
- When the app signs a different account in through that tool
- Then the person's own login stands untouched
- And running the person's own tool still reaches their own account

#### Scenario: an adopted account survives a later sign-in

- Given a connected account the app adopted from the machine
- When the app signs a different account in for the same provider
- Then the adopted account still serves as the account it adopted
