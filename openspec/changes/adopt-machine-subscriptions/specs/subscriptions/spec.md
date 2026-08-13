## ADDED Requirements

### Requirement: A credential already on the machine can become an account

The app MUST report, per provider, whether the machine already holds a credential that provider's own tool wrote. It MUST offer that credential as a way to connect without a sign-in.

Producing that report MUST NOT require a sign-in. It MUST NOT run on every visit to a surface, because opening a credential store can ask the operating system for permission.

Adopting MUST record a managed account the same way a sign-in does, and that account MUST stand among a virtual model's targets like any other. The app MUST record that the account came from the machine, because renewal ownership follows that fact.

#### Scenario: a person connects the account already on the machine

- Given the provider's own tool signed in on this machine
- When a person chooses to connect that provider
- Then the surface names the address and the plan it holds
- And connecting it records the account with no sign-in

#### Scenario: nothing on the machine to adopt

- Given the provider's own tool never signed in on this machine
- When a person chooses to connect that provider
- Then the surface offers the sign-in and says the machine holds nothing

#### Scenario: the credential store refuses to open

- Given the operating system refuses to open the credential store
- When a person chooses to connect that provider
- Then the surface says it couldn't read the store
- And it doesn't claim the machine holds nothing

#### Scenario: what the machine holds carries no account

- Given the machine holds a record for the provider that carries no account credential
- When the app reports what it holds
- Then it offers nothing to adopt

### Requirement: The app never renews a credential it adopted

An adopted credential belongs to the tool that wrote it as much as to the app. Both providers spend the refresh token on every renewal, so a second renewer signs the person out of their own tool. The app MUST NOT request a renewal for an adopted credential.

The app MUST read the live store on each serving turn rather than serve a copy it kept, because the owning tool rotates the credential without telling the app.

When an adopted credential nears expiry, the app MUST hand the renewal to the provider's own tool. That run MUST carry no window, and a lock MUST admit one renewal at a time.

A delegated renewal that can't run MUST leave the credential as it stands and MUST report the account stale. A failed renewal MUST NOT delete a credential.

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
- Then the account reports itself stale and names the tool to open
- And the credential stands as it was

### Requirement: A connected account reports when its credential stops working

An account whose credential stops working MUST read differently from an account nobody ever connected, and MUST name what to open to put it right. The app MUST NOT present a stale account as disconnected. The account, its home, and its place among a virtual model's targets all survive.

#### Scenario: a person reads a stale account

- Given a connected account whose credential stopped working
- When the subscriptions surface lists it
- Then the row reports the account stale rather than absent
- And it names the tool to open

## MODIFIED Requirements

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
