# gateway-telemetry Specification

## ADDED Requirements

### Requirement: The gateway detail carries a live status footer

The gateway detail screen MUST render a status footer under the canvas. The footer MUST aggregate the gateway's live traffic on its left side: requests per minute, p95 latency, the error count, the client count, tokens per minute, and cost. It MUST tally the composition on its right side as node and wire counts. A gateway with no traffic MUST read as zeros rather than hiding the footer, so the surface a person will watch under load already stands in place.

#### Scenario: an idle gateway reads zeros

- Given a running gateway that has served no requests
- When a person opens the gateway detail
- Then the footer shows zeroed traffic aggregates
- And the composition tally counts the nodes and wires on the canvas

#### Scenario: served traffic moves the aggregates

- Given a running gateway that serves requests
- When a person watches the footer
- Then the traffic aggregates reflect the served requests without a manual refresh

### Requirement: Clicking the footer opens the logs drawer

The footer MUST act as the one entry point to the logs drawer. A click MUST open the drawer over the lower canvas, and the open drawer MUST offer a close affordance that returns the footer to its resting state. The affordance MUST be keyboard-reachable.

#### Scenario: the footer click opens the drawer

- Given a gateway detail with the logs drawer closed
- When a person clicks the footer
- Then the logs drawer opens above the footer

#### Scenario: the drawer closes back to the footer

- Given an open logs drawer
- When a person takes the close affordance
- Then the drawer leaves
- And the footer stands as before

### Requirement: The logs drawer streams request rows

The logs drawer MUST list the gateway's request log rows, newest first, and MUST append new rows live while the drawer stands open. Every row MUST carry the request time, the method, the virtual model asked for, and the provider model it resolved to. It MUST also carry the provider, the account that served it, the status code, and the duration. A failed request MUST mark its row so errors read at a glance.

#### Scenario: a served request lands as a row

- Given an open logs drawer on a running gateway
- When the gateway serves a request
- Then a new row appears at the top carrying the virtual model, the resolved provider model, the provider, the account, the status code, and the duration

#### Scenario: a failure reads at a glance

- Given an open logs drawer
- When the gateway fails a request
- Then the row marks the failure through its status code

### Requirement: Filter chips narrow the rows

The drawer MUST offer filter chips: one for all rows, one for errors, and one per virtual model the gateway serves. Exactly one chip stands active at a time, and the active chip MUST narrow the rows to its scope.

#### Scenario: the errors chip narrows to failures

- Given an open logs drawer holding served and failed rows
- When a person takes the errors chip
- Then only the failed rows remain listed

#### Scenario: a virtual model chip narrows to its traffic

- Given a gateway serving two virtual models
- When a person takes one virtual model's chip
- Then only the rows that passed through that virtual model remain listed

### Requirement: The canvas selection scopes the drawer

The drawer MUST scope its rows to the canvas selection. The gateway shows every row, a selected virtual model shows the requests that passed through it, and a selected target shows the requests that reached it.

#### Scenario: a selected virtual model scopes the rows

- Given an open logs drawer and a canvas selection on a virtual model
- When a person reads the drawer
- Then only the rows that passed through that virtual model appear

#### Scenario: a selected target scopes the rows

- Given an open logs drawer and a canvas selection on a target
- When a person reads the drawer
- Then only the rows that reached that target appear
