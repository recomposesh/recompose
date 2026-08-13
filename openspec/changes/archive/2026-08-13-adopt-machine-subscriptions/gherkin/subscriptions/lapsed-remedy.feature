Feature: The way back follows where the account came from

  Background:
    Given the app is on the subscriptions screen

  Scenario: An account the app signed in offers to sign in again
    Given a connected "anthropic" subscription whose credential stopped working
    Then the row reports the lapse rather than reporting it as connected
    And the row offers to sign the account in again

  Scenario: An account the app adopted names the tool to open
    Given a connected "anthropic" subscription adopted from the machine
    When its credential stops working
    Then the row reports the lapse rather than reporting it as connected
    And the row names the provider's own tool to open
    And the row offers no sign-in

  Scenario: A person tells an adopted account from a signed-in one
    Given a connected "anthropic" subscription adopted from the machine
    And a connected "openai" subscription
    Then each row reports where its account came from

  Scenario: A lapsed account keeps its place among a virtual model's targets
    Given a connected "anthropic" subscription standing among a virtual model's targets
    When its credential stops working
    Then the account keeps its place among the virtual model's targets
