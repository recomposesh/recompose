Feature: A stored gateway outlives the router shape

  The version-3 migration rewrites a direct target into the one-node graph
  that serves identically, and a router naming a child whose account left
  the registry still loads, lists, and renders.

  Scenario: A version-2 gateway serves what it served after the migration
    Given a gateway stored under version 2 holding a virtual model "fast" bound to one target
    When a request arrives under "fast"
    Then the target's provider receives it under the target's real model name
    And the answer travels back to the caller

  Scenario: A router naming a deleted child still loads, lists, and renders
    Given a virtual model "fast" bound to a router over a first and a second target
    And the first target's account left the registry
    When the person opens the gateway detail
    Then the canvas draws the router node
    And the Models list holds "fast" as one row
