Feature: Log filters compose with canvas selection

  Canvas selection alone decides which subject scopes the rows. The All,
  Success, and Errors segments are one mutually exclusive outcome filter
  applied inside that selection.

  Background:
    Given a running gateway "relay" serving the virtual models "creative" and "fast"
    And requests served through both virtual models
    And an open logs drawer

  Scenario: Success narrows to successful requests
    Given served and failed requests standing as rows
    When the person chooses the "Success" log filter
    Then only the successful rows remain
    And only the "Success" log filter reads selected

  Scenario: Errors narrows to failures
    Given served and failed requests standing as rows
    When the person chooses the "Errors" log filter
    Then only the failed rows remain
    And only the "Errors" log filter reads selected

  Scenario: All returns every outcome
    Given served and failed requests standing as rows
    And the "Errors" log filter standing selected
    When the person chooses the "All" log filter
    Then every outcome row returns
    And only the "All" log filter reads selected

  Scenario: Errors composes with the selected subject
    Given the node of "creative" stands selected
    And failed requests through both virtual models
    When the person chooses the "Errors" log filter
    Then only the failed rows through "creative" remain

  Scenario: A pane click returns to the gateway without closing the drawer
    Given the node of "creative" stands selected
    When the person clicks the empty canvas
    Then rows of every virtual model return
    And the drawer heads "relay" as "Gateway"
    And the drawer stays open
