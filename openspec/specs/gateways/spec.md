# gateways Specification

## Purpose

The behavioral contract of a gateway in recompose. It covers how a person creates one, what the app stores, how the app lists it, and what the app shows about whether it serves. It also covers reaching a gateway from the menu bar.

## Requirements

### Requirement: The empty state invites the first gateway

With no gateway stored, the home surface MUST present a single call to action reading "Create your first gateway" rather than an empty surface. The call to action MUST open the creation sheet.

#### Scenario: a person opens the app with no gateway stored

- When the home surface loads and no gateway exists
- Then the surface shows the call to action
- And no gateway list renders in the sidebar

#### Scenario: a person triggers the call to action

- When a person activates "Create your first gateway"
- Then the creation sheet opens
- And focus lands on the name field

### Requirement: A person creates a gateway after the first one

The app MUST offer a way to create a gateway once one exists, because the empty-state call to action leaves with the empty state. That way MUST reach the same creation sheet, and a keyboard path MUST reach it too.

#### Scenario: a person creates a second gateway

- When one gateway exists and a person asks for a new one
- Then the creation sheet opens

### Requirement: The creation sheet takes a name and a port

The creation sheet MUST collect a display name and a port. It MUST derive the slug from the name rather than asking for one, because the slug names only a file and a route that a person never sees. The port field MUST arrive filled with a free port, so a person who has no opinion never picks one. The derivation MUST answer every name with a slug the gateway contract accepts, falling back to a stand-in slug for a name that derives nothing. The sheet MUST reject a name that a stored gateway already holds and a name that derives a device name Windows reserves. It MUST also reject a port outside 1024 through 65535 and a port that a stored gateway already holds.

#### Scenario: a person accepts what the sheet offers

- When a person enters a display name, leaves the port alone, and saves
- Then the app stores a gateway carrying that name, the slug derived from it, and the offered port

#### Scenario: a person picks their own port

- When a person replaces the offered port with another free port and saves
- Then the app stores the gateway carrying the port they typed

#### Scenario: a person enters a name a gateway already holds

- When a person enters a name that a stored gateway holds
- Then the app keeps the sheet open
- And the name field names the conflict

#### Scenario: a person enters a name that derives no slug at all

- When a person enters a name written in letters no slug can carry
- Then the app stores the gateway under the stand-in slug

#### Scenario: a person enters a name that derives a device name Windows reserves

- When a person enters a name deriving a device name Windows reserves
- Then the app refuses the save
- And the name field states that Windows reserves it

#### Scenario: a person enters a port a gateway already holds

- When a person enters a port that a stored gateway holds
- Then the app refuses the save
- And the port field names the gateway holding it

### Requirement: The sheet previews the address the gateway serves

While the sheet stands open, it MUST show the address the gateway would answer on, carrying the port in the port field. The preview MUST follow every keystroke in that field. The address MUST be the one a person pastes into a client without adding a path.

#### Scenario: a person changes the port

- When a person types a different port
- Then the preview shows the loopback address carrying that port

### Requirement: A new gateway serves the moment it saves

A gateway MUST start serving as it saves, so a person who just named a gateway can use its address at once. A gateway that loses its port to another process MUST save anyway and MUST show as stopped beside its failure.

#### Scenario: a person saves a gateway

- When a person saves a gateway carrying a free port
- Then the gateway serves
- And the sidebar shows it as running

#### Scenario: another process takes the port between the offer and the save

- When a person saves a gateway whose port another process has taken
- Then the app stores the gateway
- And the sidebar shows it as stopped
- And a message names the port

### Requirement: The sidebar lists gateways with their own state

The sidebar MUST list every stored gateway. Each row MUST carry a mark reporting whether that gateway serves. The mark MUST carry the state word as its accessible name, so a screen reader speaks the state rather than leaving a reader to infer it. Two gateways in different states MUST read differently.

#### Scenario: one gateway runs and another stays still

- When one gateway runs and a second stays still
- Then the sidebar shows the running one as running
- And it shows the other one as stopped

### Requirement: A person starts and stops one gateway from the screen

The screen MUST offer a start and stop action for the gateway a person has selected, and that action MUST reach only that gateway. A gateway that fails to start MUST show as stopped beside a message naming the port it wanted, and the app MUST offer to move it to a free port.

#### Scenario: a person starts the selected gateway

- When a person starts the selected gateway
- Then that gateway serves
- And the address the screen shows answers

#### Scenario: a person's gateway loses its port to another process

- When a person starts a gateway whose port another process holds
- Then the gateway shows as stopped
- And a message names the port
- And the app offers to move the gateway to a free port

### Requirement: The menu bar reaches every gateway

While the menu bar carries recompose, its menu MUST list every stored gateway. Each gateway MUST carry its own submenu holding start, stop, and restart, each with an icon. Every entry MUST show whether it's available rather than disappearing, so the submenu keeps one shape as state changes. The menu MUST follow gateway state without asking a person to reopen it.

#### Scenario: a person opens the menu with a gateway running

- When a person opens the menu bar menu and a gateway runs
- Then that gateway's submenu offers stop and restart
- And it shows start as unavailable

#### Scenario: a person opens the menu with a gateway stopped

- When a person opens the menu bar menu and a gateway stays still
- Then that gateway's submenu offers start
- And it shows stop and restart as unavailable

#### Scenario: a person stops a gateway from the menu bar

- When a person chooses stop in a running gateway's submenu
- Then that gateway stops answering
- And the sidebar shows it as stopped

### Requirement: Two gateways never share a port

The app MUST refuse to store a gateway carrying a port that a stored gateway already holds. The refusal MUST NOT overwrite the stored gateway.

#### Scenario: a save collides with a stored gateway

- When a save carries a port that a stored gateway holds
- Then the app refuses the save
- And the stored gateway keeps its port

### Requirement: A gateway exists before its first model

The gateway contract MUST accept a gateway carrying no virtual model, because a person creates a gateway before connecting a provider. A gateway carrying no virtual model MUST store, load, and list like any other.

#### Scenario: the app stores a gateway with no virtual model

- When a gateway with an empty virtual model list saves
- Then the app stores it
- And loading the stored document returns that gateway

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
