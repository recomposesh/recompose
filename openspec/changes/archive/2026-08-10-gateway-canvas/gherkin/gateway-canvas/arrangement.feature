Feature: Nodes move freely and the arrangement persists per gateway

  A person drags nodes anywhere. Moving a node never rewires anything, each
  gateway keeps its own layout across visits, and a tidy control restores
  the automatic arrangement.

  Scenario: Moving a node changes no binding
    Given a virtual model "fast" bound to an Anthropic key account
    When the person drags the node of "fast" across the canvas
    Then "fast" still stands bound to that account
    And the cable follows the node

  Scenario: Positions survive leaving the gateway detail
    Given the person dragged the node of "fast" to a new spot
    When the person leaves the gateway detail and returns
    Then the node of "fast" stands at that spot

  Scenario: Each gateway keeps its own arrangement
    Given a gateway "alpha" with a dragged arrangement and a gateway "beta" left untouched
    When the person opens the detail of "beta"
    Then the nodes of "beta" stand in the automatic arrangement

  Scenario: Tidy restores the automatic arrangement
    Given nodes dragged out of the automatic arrangement
    When the person invokes Tidy
    Then every node returns to its automatic place
