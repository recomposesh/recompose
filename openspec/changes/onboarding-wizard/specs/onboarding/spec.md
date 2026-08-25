## ADDED Requirements

### Requirement: A first session opens the setup wizard, and only a first session

The app MUST hold the setup wizard over the whole window when a profile has never finished it
and has never dismissed it. Every other launch MUST fall straight into the canvas, because a
person who already runs a gateway has nothing left for the wizard to ask.

Finishing the wizard and dismissing it MUST both record the same standing, so neither one
returns on the next launch. The app menu MUST offer a way back in, and taking it MUST open the
wizard again on a profile that already stands finished.

The wizard MUST NOT store where a person stood inside it. It MUST read its opening step from
what the profile already holds. A profile carrying a gateway and a virtual model MUST open on
the step that waits for the first request. Every other profile MUST open on the welcome step.

#### Scenario: a profile that has never seen the wizard

- Given a profile that has never finished the setup wizard and has never dismissed it
- When the app launches
- Then the setup wizard holds the whole window
- And it stands on the welcome step

#### Scenario: a profile that dismissed the wizard

- Given a person dismissed the setup wizard
- When the app launches again
- Then the canvas opens with no wizard over it

#### Scenario: the app menu opens the wizard again

- Given a profile that already finished the setup wizard
- When the person takes the app menu's way back into setup
- Then the setup wizard holds the whole window again

#### Scenario: a profile that closed the app before its first request

- Given a profile carrying a gateway and a virtual model that has never served a request
- And that profile has neither finished nor dismissed the setup wizard
- When the app launches
- Then the setup wizard opens on the step that waits for the first request

### Requirement: The wizard celebrates a served request, never a stored credential

The wizard MUST treat a request the gateway answered as the signal that setup finished. It MUST
read that signal from the outcome the gateway recorded for the request, and that outcome MUST
stand as served.

A connected account MUST NOT finish the wizard on its own. The app can store a credential that
a provider still turns away the first time a client spends it.

#### Scenario: a served request finishes the wizard

- Given the wizard stands on the step that waits for the first request
- When a gateway serves a request and records it as served
- Then the wizard resolves into the canvas

#### Scenario: a refused request leaves the wizard waiting

- Given the wizard stands on the step that waits for the first request
- When a gateway answers a request with a refusal and records it as refused
- Then the wizard stays on the step that waits for the first request
