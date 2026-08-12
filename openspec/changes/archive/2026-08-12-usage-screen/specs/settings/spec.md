# settings Specification

## ADDED Requirements

### Requirement: The retention window guards its own cost

The Data section MUST carry a usage retention control offering exactly 7, 30, and 90 days, backed by the `usageRetentionDays` field with 30 standing as the default. Widening the window MUST apply with no confirmation. Shortening drops history with no way back, so the change MUST hold behind a consequence dialog that names the history a shorter window drops. The ledger MUST prune to the accepted window on its next flush. A settings document from an older version MUST migrate by keeping a month of usage.

#### Scenario: the Data section offers three windows with 30 standing

- When a person reaches the usage retention row
- Then the control offers 7, 30, and 90 days with 30 days selected

#### Scenario: widening the window asks nothing

- When the maintainer widens retention to 90 days
- Then the change applies with no confirmation

#### Scenario: a shortening states its cost and holds

- Given 30 days of served history stands
- When the maintainer shortens retention to 7 days
- Then a confirmation names the history a shorter window drops
- And the change holds until the maintainer answers

#### Scenario: declining keeps the window and the history

- Given a shortening awaits its confirmation
- When the maintainer declines
- Then retention stays as it stood and no history leaves

## MODIFIED Requirements

### Requirement: Controls that wait, controls that decided, and controls that never arrive

The app MUST NOT offer a working control for a setting nothing reads. A setting whose machinery the repository lacks MUST render as unavailable and MUST name what it waits for. A reason MUST name a surface a person can picture rather than a subsystem, so it stays true as the machinery arrives. A setting the app has decided rather than deferred MUST state its value instead of rendering as an unavailable control. An inert control implies a choice that nobody will offer. A setting the project has decided never to build MUST be absent rather than waiting, because a row that names what will never arrive promises work nobody plans to do. The usage retention row left this list when the usage ledger arrived: it now stands as a live control under its own requirement.

#### Scenario: a person meets a setting that waits on launch-time start

- When a person reaches the gateway autostart row
- Then the control renders as unavailable and names launch-time start as what it waits for
- And the settings document holds no field for it

#### Scenario: a person looks for the bind address

- When a person reaches the bind address row
- Then the row states both loopback addresses as a value rather than offering a control
- And the row states that recompose never serves the network
