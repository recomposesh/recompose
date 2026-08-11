Feature: No prompt or answer ever reaches the surfaces

  The footer and the drawer read traffic shape only. Request and response
  bodies never ride along, and a failure explains itself from the status
  alone.

  Background:
    Given a running gateway "relay" serving the virtual model "creative"
    And an open logs drawer

  Scenario: A served request leaks nothing
    Given "relay" served a request carrying the prompt "my secret plan"
    When the person reads the drawer and its rows
    Then "my secret plan" appears nowhere

  Scenario: A failure explains itself from the status alone
    Given the provider refused a request with status 429 and the answer text "quota exceeded for acme"
    When the person reads the failed row
    Then "quota exceeded for acme" appears nowhere
    And the row carries status 429
