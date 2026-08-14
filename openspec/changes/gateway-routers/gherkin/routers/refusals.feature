Feature: A router that cannot serve refuses legibly

  A router holding no child, and a router whose every child stands cooling,
  answer a typed refusal instead of picking a child anyway. The refusal says
  what stood in the way and when trying again can work.

  Scenario: An empty router refuses before any request leaves the machine
    Given a virtual model "fast" bound to a router holding no child
    When a request arrives under "fast"
    Then the gateway answers a typed refusal naming the empty router
    And no request leaves the machine

  Scenario: Every child cooling answers the exhausted refusal
    Given a virtual model "fast" bound to a round-robin router over a first and a second target
    And both targets stand cooling from earlier rate limits
    When a request arrives under "fast"
    Then the gateway answers a typed refusal naming each child and its reason
    And the refusal carries the earliest retry time
