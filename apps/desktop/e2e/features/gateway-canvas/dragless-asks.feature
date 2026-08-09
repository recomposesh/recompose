Feature: Every source port answers a keyboard without a drag

  The canvas shows no standing icon beside a node: a pointer meets only the
  cable. Each source port still carries an ask a keyboard reaches, painted
  only under keyboard focus. The gateway's ask births a draft virtual model,
  and a virtual model's ask opens the picker of stored accounts.

  Scenario: An empty gateway stands plain
    Given a gateway with no virtual models defined
    When the person opens the gateway detail
    Then the gateway stands as a plain node with no standing affordance beside its port

  Scenario: The ask paints only under keyboard focus
    Given a gateway holding a virtual model "fast" bound to a target
    When the person moves keyboard focus onto the gateway port's ask
    Then the ask paints and names what it offers
    And the ask of "fast" stays unpainted

  Scenario: The gateway's ask births a draft virtual model
    Given an open gateway detail
    When the person takes up the gateway port's ask without a drag
    Then a draft virtual model node stands wired to the gateway
    And the inspector opens with the name field focused

  Scenario: A virtual model's ask opens the picker
    Given a virtual model "fast" holding no target
    When the person takes up the ask on the port of "fast" without a drag
    Then the picker of stored accounts opens
