Feature: The gateway composition reads as a wired canvas

  The gateway detail draws the gateway, its virtual models, and their targets
  as nodes joined by cables, so the topology a person composed reads at a
  glance. Only wired nodes appear: a stored account bound to nothing never
  floats on the canvas.

  Scenario: An existing composition appears wired
    Given a gateway holding a virtual model "fast" bound to an Anthropic key account
    When the person opens the gateway detail
    Then the canvas shows the gateway, "fast", and the account as nodes
    And cables join the gateway to "fast" and "fast" to the account

  Scenario: A stored account bound to nothing stays off the canvas
    Given a stored key account no virtual model targets
    When the person opens the gateway detail
    Then no node stands for that account
