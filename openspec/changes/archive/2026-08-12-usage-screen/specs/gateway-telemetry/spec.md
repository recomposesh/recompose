# gateway-telemetry Specification

## MODIFIED Requirements

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
