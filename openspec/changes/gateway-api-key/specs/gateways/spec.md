## ADDED Requirements

### Requirement: A gateway stores an optional API key and whether it requires one

A stored gateway MUST be able to carry an API key together with the answer to whether callers have to
present it. The two MUST travel as one field, so no document can name a requirement it holds no key
for. A gateway MUST also be able to carry no key at all, which is what a gateway that never minted
one carries. A gateway stored before this capability existed MUST read back unchanged and MUST carry
no key.

The stored document MUST accept any non-blank value as the key, so a document a person edited by hand
reads back rather than going to quarantine. A build that predates the field MUST report a document
carrying it as written by a newer build rather than quarantining it.

#### Scenario: a gateway stored before the field reads back

- When the app reads a gateway document written before the API key field existed
- Then the gateway reads back with every stored value intact
- And it carries no API key

#### Scenario: an older build meets a document carrying a key

- When a build that predates the field reads a document carrying one
- Then it reports the document as written by a newer build
- And it leaves the file where it stands

### Requirement: Turning the requirement off keeps the key

A person MUST be able to stop a gateway requiring its API key without losing the key. While the
requirement stands off, the gateway MUST answer callers that present no key, and the stored key MUST
survive. Turning the requirement back on MUST enforce the same key the gateway held before. A person
whose clients already carry that key MUST NOT have to reach every one of them again.

#### Scenario: a person turns the requirement off

- When a gateway requires its API key and a person turns the requirement off
- Then the gateway answers a caller that presents no key
- And the stored gateway still carries the key

#### Scenario: a person turns the requirement back on

- When a gateway holds a key it no longer requires and a person turns the requirement on
- Then the gateway requires the key it already held
- And the app mints no new key

### Requirement: A document change leaves a stopped gateway stopped

A change to a stored gateway document MUST reach a gateway that serves, and MUST NOT start one that
stands stopped. A person who stopped a gateway MUST find it stopped after any edit to its document,
including an edit made outside the app. Nothing about editing a document is a request to serve.

#### Scenario: a serving gateway's document changes

- When a gateway serves and its stored document changes
- Then the gateway serves again under the changed document

#### Scenario: a stopped gateway's document changes

- When a gateway stands stopped and its stored document changes
- Then the gateway stays stopped
- And nothing starts a listener on its port

### Requirement: The app mints the key rather than asking for one

The app MUST mint the API key from the platform random source rather than collecting one a person
typed, because a person picking a credential picks a weak one. The minted value MUST carry at least
128 bits of entropy and MUST be recognizable as a recompose value on sight. Minting again over a
stored key MUST replace it, so a person answers a leak by replacing one gateway's credential rather
than every gateway's.

#### Scenario: a person turns the requirement on for a gateway holding no key

- When a person turns on the API key of a gateway holding none
- Then the app mints one
- And the gateway requires it

#### Scenario: a person replaces a key

- When a gateway holds an API key and a person asks for a new one
- Then the stored key is the newly minted value
- And no other gateway's key changes

### Requirement: The drawer carries an Access section of its own

The gateway drawer MUST carry an Access section between General Info and Endpoint, rather than folding
the key into the box that edits the gateway's name. The section heading MUST carry the switch that
turns the requirement on and off. The section MUST state the fields a client can present the key in,
because a person who copies a key still has to know where their client puts it.

The section MUST show the key masked to its prefix and its last four characters. It MUST offer a
control that copies the whole value to the clipboard, and MUST NOT offer a control that reveals the
value on screen. A revealed secret survives on every surface that captures a screen, and copying
carries the value where it needs to go.

The switch and the regeneration MUST take effect when a person acts on them, rather than waiting for a
save, because neither is a field a person types into.

#### Scenario: a gateway requires no key

- When a person opens the Access section of a gateway requiring no API key
- Then the switch reads off
- And the section shows no key

#### Scenario: a gateway requires a key

- When a person opens the Access section of a gateway requiring an API key
- Then the switch reads on
- And the section shows the prefix and the last four characters of the value
- And nothing on the screen reveals the rest

#### Scenario: a person copies the key

- When a person activates the copy control beside a required API key
- Then the whole value reaches the clipboard
- And the surface says the copy landed

#### Scenario: a person reads where the key goes

- When a person opens the Access section of a gateway requiring an API key
- Then the section names the fields a client can carry the key in

### Requirement: Regenerating a key asks first

Regenerating MUST ask a person to confirm before it replaces a stored key, and the question MUST state
that clients carrying the current key stop reaching the gateway. Turning the requirement on or off MUST
NOT ask, because neither act invalidates a credential a person already handed out.

#### Scenario: a person asks to regenerate

- When a person asks to regenerate the API key of a gateway
- Then the app asks them to confirm
- And the question states that clients carrying the current key stop reaching the gateway

#### Scenario: a person backs out of a regeneration

- When a person meets the regeneration question and declines
- Then the stored key is the key the gateway already held

#### Scenario: turning the requirement off asks nothing

- When a person turns off the API key of a gateway
- Then nothing asks them to confirm
