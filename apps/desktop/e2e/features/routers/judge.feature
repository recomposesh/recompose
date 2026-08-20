Feature: The judge stands beside the router it advises

  The judge is a real binding, an account plus a provider model, drawn as
  its own node above the router. It answers to keyboard and inspector like
  any node, wears its cooling state in the open, and a conditional router
  without one stays a draft.

  Scenario: The judge node answers to the keyboard and the inspector
    Given a conditional router with its judge on the canvas
    When the person, with the keyboard alone, moves focus to the judge node and selects it
    Then the inspector speaks for the judge
    And it names the judge's account and provider model

  Scenario: A cooling judge says how long it stands down
    Given a conditional router whose judge stands cooling from an earlier rate limit
    When the person selects the judge node
    Then the judge node wears its cooling state
    And the inspector prints the remaining cooldown window

  Scenario: A conditional router without a judge stays a draft
    Given a conditional router holding a "code" branch and an else branch but no judge
    Then the router stands in its draft treatment
    And the definition cannot complete until a judge is bound
