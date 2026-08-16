Feature: The canvas selection scopes the rows

  Every selectable subject on the canvas answers in the drawer: the gateway
  shows everything, and a narrower subject narrows the stream to what
  passed through or reached it.

  Background:
    Given a running gateway "relay" serving the virtual models "creative" and "fast"
    And requests served through both virtual models
    And an open logs drawer

  Scenario: No selection shows everything
    When the person reads the drawer with nothing selected
    Then rows of "creative" and rows of "fast" list together
    And the drawer heads "relay" as "Gateway"

  Scenario: A selected virtual model narrows to its traffic
    When the person selects the node of "creative"
    Then only the rows through "creative" remain
    And the drawer heads "creative" as "Virtual model"

  Scenario: A selected cable answers as its virtual model
    When the person selects the cable of "creative"
    Then only the rows through "creative" remain
    And the drawer heads "creative" as "Binding"

  Scenario: A selected target narrows to what reached it
    Given "creative" bound to the Anthropic account "work"
    When the person selects the target node of the account "work"
    Then only the rows that reached "work" remain
    And the drawer heads "work" as "Provider"

  Scenario: A removed target still answers for its rows
    Given rows that reached a target since removed from the registry
    When the person selects the ghost target node
    Then those rows remain listed
    And the drawer shows subject type "Removed provider"

  Scenario: A draft narrows nothing
    Given a draft virtual model node on the canvas
    When the person selects the draft
    Then every row stays listed
    And the drawer heads "New virtual model" as "Draft"
