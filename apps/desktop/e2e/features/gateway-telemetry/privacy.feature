Feature: No prompt or answer ever reaches the surfaces

  The footer and the drawer read traffic shape only. Request and response
  bodies never ride along. A refused request quotes the one sentence its
  provider wrote to explain the refusal, and nothing else the provider sent.

  Background:
    Given a running gateway "relay" serving the virtual model "creative"
    And an open logs drawer

  Scenario: A served request leaks nothing
    Given "relay" served a request carrying the prompt "my secret plan"
    When the person reads the drawer and its rows
    Then "my secret plan" appears nowhere

  Scenario: A refusal carries the provider's sentence and nothing around it
    Given the provider refused the prompt "my secret plan" with status 429, saying "quota exceeded for acme"
    When the person reads the failed request beside the run
    Then the reading quotes "quota exceeded for acme"
    And "my secret plan" appears nowhere
    And "invalid_request_error" appears nowhere
