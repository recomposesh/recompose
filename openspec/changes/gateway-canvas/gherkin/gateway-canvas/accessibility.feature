Feature: Binding without a drag

  Every binding a cable drag can create also arrives through single presses
  or the keyboard alone, every binding outcome announces through the live
  region, and every pointer target is big enough to hit.

  Scenario: Single presses create a binding with no drag
    Given a virtual model "fast" holding no target
    When the person presses the plus on the port of "fast", picking the stored Anthropic key account and the provider model "claude-sonnet-5"
    Then "fast" stands bound to that account
    And the account stands wired as a target node

  Scenario: The keyboard alone creates a binding
    Given a virtual model "fast" holding no target
    When the person, with the keyboard alone, activates the plus of "fast", picking the stored Anthropic key account and the provider model "claude-sonnet-5"
    Then "fast" stands bound to that account

  Scenario: The live region announces a new binding
    Given a virtual model "fast" holding no target
    When the person binds "fast" to the stored Anthropic key account
    Then the live region announces the new binding

  Scenario: An incompatible drop refuses and announces
    Given a stored key account standing as a target node
    When the person drops a cable from the gateway's port onto that node
    Then the composition stands unchanged
    And the live region announces the refusal

  Scenario: The live region announces an unbind
    Given the cable of a virtual model "fast" selected
    When the person presses Delete
    Then the live region announces the removed binding

  Scenario: Every pointer target meets the minimum size
    Given a gateway holding a virtual model bound to a target
    When the person opens the gateway detail
    Then every port, plus, and cable endpoint offers a hit target of at least 24 by 24 pixels
