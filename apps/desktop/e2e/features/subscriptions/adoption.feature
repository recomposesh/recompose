Feature: Adopting the account already on the machine

  Background:
    Given the app is on the subscriptions screen

  Scenario: The catalog names the account the machine holds
    Given the "anthropic" tool signed in on this machine as "dev@example.com" on the "Max" plan
    When the maintainer picks "anthropic"
    Then the catalog offers the account it found, named "dev@example.com" on the "Max" plan
    And signing in with a different account stays available

  Scenario: Connecting what the machine holds records the account with no sign-in
    Given the "anthropic" tool signed in on this machine as "dev@example.com" on the "Max" plan
    When the maintainer connects the account the machine holds
    Then the screen lists one subscription account
    And the standing reads "Connected" with a mark beside the word
    And no sign-in begins

  Scenario: An adopted account stands among a virtual model's targets
    Given a connected "anthropic" subscription adopted from the machine
    Then the account stands among a virtual model's target choices like any other
