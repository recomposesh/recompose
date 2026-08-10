Feature: A cable is a first-class object

  A cable takes selection, shows its binding in the inspector, rebinds by
  endpoint drag or by a fresh cable, and unbinds on Delete with no
  confirmation. Removing a definition, unlike unbinding, asks first. A
  binding whose target left the registry keeps its cable on a ghost node.

  Scenario: Selecting a cable shows the binding in the inspector
    Given a virtual model "fast" bound to an Anthropic key account serving "claude-sonnet-5"
    When the person selects the cable between them
    Then the inspector reads the account and its model "claude-sonnet-5"

  Scenario: Dragging an endpoint rebinds the cable
    Given a virtual model "fast" bound to a subscription account
    And a stored key account standing as a target node
    When the person drags the endpoint of the cable from "fast" onto the key account node
    Then "fast" stands bound to the key account
    And no cable runs from "fast" to the subscription account

  Scenario: A new cable from a bound virtual model rebinds it
    Given a virtual model "fast" bound to a subscription account
    And a stored key account standing as a target node
    When the person drags a new cable from the port of "fast" onto the key account node
    Then "fast" stands bound to the key account
    And the old cable falls

  Scenario: Delete unbinds a selected cable without confirmation
    Given the cable of a virtual model "fast" selected
    When the person presses Delete
    Then the binding is removed with no confirmation asked
    And "fast" stands on the canvas holding no target

  Scenario: Delete on a virtual model node asks first
    Given a virtual model node "fast" selected
    When the person presses Delete
    Then a confirmation asks before anything is removed

  Scenario: Confirming removes the definition
    Given the confirmation open for deleting the virtual model "fast"
    When the person confirms
    Then the node "fast" leaves the canvas
    And the gateway holds no definition named "fast"

  Scenario: A removed target leaves a ghost node holding the cable
    Given a virtual model "fast" bound to a key account
    When that account is removed from the stored accounts
    Then the cable of "fast" holds, ending on a ghost node marked as removed

  Scenario: A cable gesture repairs a broken binding
    Given the cable of "fast" ending on a ghost node
    And a stored Anthropic key account standing as a target node
    When the person drags the endpoint of the broken cable onto the key account node
    Then "fast" stands bound to that account
    And the ghost node leaves the canvas
