Feature: A dragged cable creates a binding

  Pulling a cable out of a port and dropping it wires the composition
  directly. A drop on empty canvas becomes an add through the picker of
  stored accounts, never a silent cancel, and Esc is the one way out.

  Scenario: A cable dropped on a target binds the virtual model
    Given a virtual model "fast" holding no target
    And a stored Anthropic key account standing as a target node
    When the person drags a cable from the port of "fast" onto the target node
    Then "fast" stands bound to that account
    And the canvas draws the new cable

  Scenario: A drop on empty canvas opens the picker
    Given a virtual model "fast" holding no target
    When the person drags a cable from the port of "fast" and drops it on empty canvas
    Then the picker of stored accounts opens
    And it anchors to a pending target card at the drop point

  Scenario: Picking an account materializes the wired target
    Given the picker open from a cable dragged out of "fast" and dropped on empty canvas
    When the person picks the stored Anthropic key account
    Then the account stands as a target node at the drop point
    And "fast" stands bound to it

  Scenario: Esc dismisses the picker and removes the pending card
    Given the picker open from a cable dragged out of "fast" and dropped on empty canvas
    When the person presses Esc
    Then the picker closes and the pending card leaves the canvas
    And "fast" still holds no target

  Scenario: Esc cancels a drag in flight
    Given a cable drag in flight from the port of "fast"
    When the person presses Esc
    Then the drag cancels
    And the composition stands unchanged

  Scenario: A cable from the gateway births a draft virtual model
    Given an open gateway detail
    When the person drags a cable from the gateway's port and drops it on empty canvas
    Then a draft virtual model node stands wired to the gateway at the drop point
    And the inspector opens with the name field focused
