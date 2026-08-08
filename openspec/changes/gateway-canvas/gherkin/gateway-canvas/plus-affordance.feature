Feature: The plus affordance keeps an add path on every source port

  Every source port carries a persistent plus, wired or bare, so adding never
  needs a drag. The gateway's plus births a draft virtual model, and a
  virtual model's plus opens the picker of stored accounts.

  Scenario: A bare gateway draws a wire ending in a plus
    Given a gateway with no virtual models defined
    When the person opens the gateway detail
    Then the gateway node draws an automatic wire ending in a plus

  Scenario: A wired gateway keeps the plus on every source port
    Given a gateway holding a virtual model "fast" bound to a target
    When the person opens the gateway detail
    Then the gateway's port carries a plus
    And the port of "fast" carries a plus

  Scenario: The gateway's plus births a draft virtual model
    Given an open gateway detail
    When the person presses the plus on the gateway's port
    Then a draft virtual model node stands wired to the gateway
    And the inspector opens with the name field focused

  Scenario: A virtual model's plus opens the picker
    Given a virtual model "fast" holding no target
    When the person presses the plus on the port of "fast"
    Then the picker of stored accounts opens
