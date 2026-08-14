Feature: The API key a gateway holds

  Background:
    Given a gateway named "codex" exists

  Scenario: A gateway starts out open
    When a person opens the API key control of "codex"
    Then it reads that clients reach "codex" without a key

  Scenario: A person turns the key on
    When a person turns on the API key of "codex"
    Then "codex" holds a minted key
    And "codex" requires that key

  Scenario: A person copies the key into a client
    Given "codex" requires an API key
    When a person copies the API key of "codex"
    Then the clipboard carries the whole key

  Scenario: A person replaces a key that leaked
    Given "codex" requires an API key
    When a person regenerates the API key of "codex" and accepts the cost
    Then "codex" requires a key it never held before

  Scenario: A person backs out of a regeneration
    Given "codex" requires an API key
    When a person asks to regenerate the API key of "codex" and declines
    Then "codex" requires the key it already held

  Scenario: A person turns the key off without losing it
    Given "codex" requires an API key
    When a person turns off the API key of "codex"
    Then clients reach "codex" without a key
    And "codex" still holds the key those clients carry
