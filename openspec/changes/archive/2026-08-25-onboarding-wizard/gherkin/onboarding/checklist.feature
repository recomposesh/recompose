Feature: The checklist coaches the same journey on the canvas

  The sidebar checklist stands four steps and reads every one of them from what
  the profile holds. It survives a dismissed wizard, because a person who left
  setup early is the person it exists for.

  Scenario: A dismissed wizard leaves the checklist standing
    Given the get-started checklist standing on the canvas
    When the person dismisses the setup wizard
    Then the checklist still stands on the canvas
    And it stands on opening a gateway

  Scenario: The checklist reports what the wizard already built
    Given a profile the wizard carried to a served request
    When the person reads the get-started checklist
    Then all four steps read as finished

  Scenario: A request the target turned away ticks nothing
    Given a profile that has never served a request
    When a request reaches a target and the target answers with a refusal
    Then the checklist still stands on sending the first request

  Scenario: A request the target answered ticks the last step
    Given a profile that has never served a request
    When a gateway records a request as served
    Then the checklist reads all four steps as finished
