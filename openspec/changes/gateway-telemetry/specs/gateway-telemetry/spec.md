# gateway-telemetry Specification

## ADDED Requirements

### Requirement: The gateway detail carries a live status footer

The gateway detail screen MUST render a status footer under the canvas, spanning the main pane. The footer MUST aggregate the gateway's live traffic on its left side over one rolling 60-second window. The aggregates are requests per minute, p95 latency, the error count, the count of distinct client apps, and tokens per minute. It MUST tally the composition on its right side as node and wire counts. The error count MUST hide at zero, and it MUST take the trailing end of the traffic side when it appears. The footer MUST NOT show a cost figure. A row stamped ahead of the current instant MUST still count inside the window, so a clock skew never hides traffic. A gateway with no traffic MUST read zeros rather than hiding the footer, so the surface a person will watch under load already stands in place.

#### Scenario: an idle gateway reads zeros

- Given a running gateway that has served no requests
- When a person opens the gateway detail
- Then the footer shows zeroed traffic aggregates and no error count
- And the composition tally counts the nodes and wires on the canvas

#### Scenario: served traffic moves the aggregates

- Given a running gateway that serves requests
- When a person watches the footer
- Then the traffic aggregates reflect the served requests without a manual refresh

#### Scenario: a failure surfaces the error count

- Given a footer showing no error count
- When the gateway fails a request
- Then the error count appears in the danger treatment

### Requirement: A disclosure control on the footer opens the logs drawer

A discrete disclosure control at the footer's trailing end MUST act as the one on-screen entry point to the logs drawer. The Gateway menu MUST carry a Show Logs item as the control's command twin, driving the same open state. Opening MUST stand the drawer under the stage in the canvas column, and the stage MUST stay visible and usable above it. The open drawer MUST offer a keyboard-reachable close affordance that returns the footer to its resting state.

#### Scenario: the disclosure control opens the drawer

- Given a gateway detail with the logs drawer closed
- When a person takes the disclosure control on the footer
- Then the logs drawer opens under the stage

#### Scenario: the menu twin opens the drawer

- Given a gateway detail with the logs drawer closed
- When a person picks Show Logs from the Gateway menu
- Then the logs drawer opens

#### Scenario: the drawer closes back to the footer

- Given an open logs drawer
- When a person takes the close affordance
- Then the drawer leaves
- And the footer stands as before

### Requirement: The logs drawer streams request rows

The logs drawer MUST list the gateway's request log rows, newest at the top, and MUST append new rows live while the drawer stands open. Every row MUST carry the request time, the method, the virtual model asked for, and the provider model it resolved to. It MUST also carry the provider, the account that served it, the status code, and the duration. A failed request MUST mark its row so errors read at a glance, and its duration cell stays empty. A request the gateway fails before reaching any provider MUST still land as a row.

#### Scenario: a served request lands as a row

- Given an open logs drawer on a running gateway
- When the gateway serves a request
- Then a new row appears at the top carrying the virtual model, the resolved provider model, the provider, the account, the status code, and the duration

#### Scenario: a failure reads at a glance

- Given an open logs drawer
- When the gateway fails a request
- Then the row marks the failure through its status code

#### Scenario: an unreachable target still writes a row

- Given a virtual model bound to an unreachable target
- When the gateway fails the request
- Then a row lands carrying the failure status with empty provider cells

### Requirement: Scope selectors narrow the rows

The drawer MUST offer scope selectors: one for the whole gateway, one per virtual model, and a transient selector for a selected target. Exactly one scope stands active at a time. An independent errors filter MUST compose with the active scope, narrowing it to failures. Pressing a virtual model's selector MUST select its canvas node, and selecting the node MUST light its selector.

#### Scenario: the errors filter narrows to failures

- Given an open logs drawer holding served and failed rows
- When a person turns on the errors filter
- Then only the failed rows remain listed

#### Scenario: a virtual model's selector narrows to its traffic

- Given a gateway serving two virtual models
- When a person takes one virtual model's selector
- Then only the rows that passed through that virtual model remain listed

#### Scenario: the errors filter composes with a scope

- Given a scope standing on one virtual model and failures through both
- When a person turns on the errors filter
- Then only that virtual model's failed rows remain listed

### Requirement: The canvas selection scopes the drawer

The drawer MUST scope its rows to the canvas selection across every selectable subject. The gateway shows every row, and a virtual model shows the requests that passed through it. A cable shows its virtual model's requests, and a target shows the requests that reached it. A removed target shows the requests that reached its departed identity, and a draft narrows nothing.

#### Scenario: a selected virtual model scopes the rows

- Given an open logs drawer and a canvas selection on a virtual model
- When a person reads the drawer
- Then only the rows that passed through that virtual model appear

#### Scenario: a selected target scopes the rows

- Given an open logs drawer and a canvas selection on a target
- When a person reads the drawer
- Then only the rows that reached that target appear

#### Scenario: a removed target still answers

- Given rows that reached a target since removed
- When a person selects the ghost target node
- Then those rows remain listed

### Requirement: The drawer names the stream state

The drawer header MUST show the stream state beside the title: live while the stream stands connected, stopped once the gateway stops. The indicator MUST hold its place in the header rather than vanishing. The rows MUST stay readable after a stop.

#### Scenario: stopping the gateway reads stopped

- Given an open logs drawer on a running gateway
- When the gateway stops
- Then the header reads stopped
- And the listed rows stay readable

### Requirement: Reopening the drawer keeps what a person saw

The drawer MUST merge the backfill with the rows it already holds rather than replacing them. Closing and reopening the drawer MUST NOT lose a row a person saw.

#### Scenario: rows survive a reopen

- Given rows standing in an open logs drawer
- When a person closes and reopens the drawer
- Then every row still stands
