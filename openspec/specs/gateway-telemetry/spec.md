# gateway-telemetry Specification

## Purpose

A running gateway serves invisible traffic without this surface: a person starts it, points a client at it, and reads nothing back. The gateway detail therefore carries two live-traffic surfaces fed by one row stream. A status footer under the canvas answers whether the gateway is alive and how hard it works, over one rolling sixty-second window. A logs drawer opening from the toolbar answers what it just did, request by request, scoped by the canvas selection. No prompt or completion body ever rides a row, and no cost figure appears anywhere.

## Requirements

### Requirement: The gateway detail carries a live status footer

The gateway detail screen MUST render a status footer under the canvas, spanning the main pane. The footer MUST aggregate the gateway's live traffic on its left side over one rolling 60-second window. The aggregates are requests per minute, p95 latency, the error count, the count of distinct client apps, and tokens per minute. It MUST tally the composition on its right side as node and wire counts. The error count MUST hide at zero, and it MUST take the trailing end of the traffic side when it appears. The footer and the logs drawer MUST NOT show a cost figure: cost readings belong to the usage screen alone, where the basis split and the day-width rule hold. A row stamped ahead of the current instant MUST still count inside the window, so a clock skew never hides traffic. A gateway with no traffic MUST read zeros rather than hiding the footer, so the surface a person will watch under load already stands in place.

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

#### Scenario: cost reads on the usage screen alone

- Given a gateway serving priced traffic
- When a person reads the footer and the logs drawer
- Then no cost figure appears on either surface
- And the gateway's usage summary links into the usage screen for the spend reading

### Requirement: The toolbar's Request log control opens the logs drawer

The toolbar's Request log control MUST act as the one on-screen entry point to the logs drawer, and it MUST read as expanded while the drawer stands open. The Gateway menu MUST carry a Show Logs item as the control's command twin, driving the same open state. The footer MUST offer nothing to press: it reads as selectable text, so a person can take a reading into a bug report. The way to the drawer stays on the toolbar. Opening MUST stand the drawer under the stage in the canvas column, and the stage MUST stay visible and usable above it. The open drawer MUST offer a keyboard-reachable close affordance.

#### Scenario: the toolbar control opens the drawer

- Given a gateway detail with the logs drawer closed
- When a person takes the Request log control on the toolbar
- Then the logs drawer opens under the stage

#### Scenario: the menu twin opens the drawer

- Given a gateway detail with the logs drawer closed
- When a person picks Show Logs from the Gateway menu
- Then the logs drawer opens

#### Scenario: the footer offers nothing to press

- When a person reads the status footer
- Then nothing on it acts as a control
- And the toolbar's Request log control stays the way to the drawer

#### Scenario: the drawer closes

- Given an open logs drawer
- When a person takes the close affordance
- Then the drawer leaves

### Requirement: The logs drawer streams request rows

The logs drawer MUST list the gateway's request log rows, newest at the top, and MUST append new rows live while the drawer stands open. Every row MUST carry the request time, the method, the virtual model asked for, and the provider model it resolved to. It MUST also carry the provider, the account that served it, the status code, and the duration. A failed request MUST mark its row so errors read at a glance, and it MUST keep the duration the failure took to arrive. A request the gateway fails before reaching any provider MUST still land as a row, and only such an unserved request leaves its duration cell empty. A request whose provider answer hasn't finished MUST read as live rather than claiming a final status.

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

### Requirement: The outcome segments narrow the scoped rows

The drawer MUST carry no scope pickers of its own: the canvas selection is the one scope, and the drawer header MUST name the selected subject. A segmented outcome control MUST offer All, Success, and Errors, and the picked segment MUST compose with the standing scope. Success MUST keep only the served rows and Errors only the failed ones. A request still in flight MUST show under All alone, because its outcome isn't a fact yet.

#### Scenario: the Errors segment narrows to failures

- Given an open logs drawer holding served and failed rows
- When a person picks the Errors segment
- Then only the failed rows remain listed

#### Scenario: the Success segment narrows to served rows

- Given an open logs drawer holding served and failed rows
- When a person picks the Success segment
- Then only the served rows remain listed

#### Scenario: a segment composes with the canvas selection

- Given a canvas selection standing on one virtual model and failures through two
- When a person picks the Errors segment
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
