Feature: Defining a virtual model on a gateway

  A person names a virtual model and binds it to one stored target: an account
  and one real model that account serves. The definition stands as one row.

  Scenario: A person defines a virtual model bound to one target
    Given a gateway with a stored Anthropic key account
    When the person defines a virtual model "fast" targeting that account's "claude-sonnet-5"
    Then the Models list holds "fast" as one row
    And the row reads "fast", the id "claude-fast", then its target

  Scenario: The person picks the real model rather than typing it
    Given a gateway with a stored Anthropic key account whose model list is reachable
    When the person picks that account as the target for a new virtual model
    Then the Model field offers the account's live model list
    And the field accepts no free-text model

  Scenario: An unreachable model list refuses in the inspector
    Given a gateway with a stored Anthropic key account whose model list is unreachable
    When the person picks that account as the target for a new virtual model
    Then the inspector reads a typed refusal naming the failed look
    And no definition is stored

  Scenario: A named model takes an id one client's picker keeps
    Given a gateway with a stored Anthropic key account
    When the person names a new virtual model "Fast Sonnet"
    Then the Model id field reads "claude-fast-sonnet"

  Scenario: The inspector offers the reshaping back to an id a person stripped
    Given a gateway with a stored Anthropic key account
    When the person names a new virtual model "Fast Sonnet"
    And the person rewrites the model id as "fast-sonnet"
    And the person takes the reshaped id the inspector offers
    Then the Model id field reads "claude-fast-sonnet"
