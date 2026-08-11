Feature: The scope strip and the canvas selection are one mechanism

  Pressing a scope selects the matching canvas node, and selecting a node
  lights its scope. The errors filter is independent and composes with
  whatever scope stands.

  Background:
    Given a running gateway "relay" serving the virtual models "creative" and "fast"
    And requests served through both virtual models
    And an open logs drawer

  Scenario: Pressing a scope selects the node
    When the person presses the "creative" scope
    Then the canvas selects the node of "creative"
    And only the rows through "creative" remain

  Scenario: Selecting a node lights its scope
    When the person selects the node of "fast" on the canvas
    Then the "fast" scope reads selected

  Scenario: All returns the whole stream
    Given the scope standing on "creative"
    When the person presses All
    Then rows of every virtual model return
    And the canvas selection clears

  Scenario: Errors narrows to failures
    Given served and failed requests standing as rows
    When the person turns on the Errors filter
    Then only the failed rows remain

  Scenario: Errors composes with a scope
    Given the scope standing on "creative"
    And failed requests through both virtual models
    When the person turns on the Errors filter
    Then only the failed rows through "creative" remain

  Scenario: A pane click resets the scope without closing the drawer
    Given the scope standing on "creative"
    When the person clicks the empty canvas
    Then the scope returns to All
    And the drawer stays open

  Scenario: A selected target shows a transient scope
    Given "creative" bound to the Anthropic account "work"
    When the person selects the target node of the account "work"
    Then a scope carrying the target's name appears selected

  Scenario: A removed target's scope reads Removed
    Given rows that reached a target since removed from the registry
    When the person selects the ghost target node
    Then a transient scope reads Removed

  Scenario: Every virtual model stays reachable from the strip
    Given "relay" serving eight virtual models
    When the person opens the strip's overflow
    Then every virtual model stands listed
