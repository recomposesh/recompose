Feature: A cable meets a router on the canvas

  A cable dropped on empty canvas asks what to bind before anything else,
  a router or a target, and the same ask serves a router's next child. When
  one request touches two targets, each cable paints the attempt it carried.

  Scenario: A drop on empty canvas asks router or target
    Given a virtual model "fast" holding no target
    When the person drags a cable from the port of "fast" and drops it on empty canvas
    Then an ask offers a router or a target before anything else

  Scenario: Picking the target continues into the account pick
    Given the ask open from a cable dragged out of "fast" and dropped on empty canvas
    When the person picks the target
    Then the picker of stored accounts opens

  Scenario: Picking the router drops a wired router holding no child
    Given the ask open from a cable dragged out of "fast" and dropped on empty canvas
    When the person picks the router
    Then a router node stands wired to "fast" at the drop point
    And it holds no child

  Scenario: The same ask from a router's port nests a router
    Given a router node standing wired to a virtual model "fast"
    When the person drags a cable from the router's port, drops it on empty canvas, and picks the router
    Then a second router stands wired as the first router's child

  Scenario: One request paints each attempted cable with its own standing
    Given a virtual model "fast" bound to a failover router over a first and a second target
    And the person watches the gateway detail
    When a request under "fast" fails over from the first target to the second
    Then the first target's cable paints as failed
    And the second target's cable paints as served
    And the cable into the router paints as served
