Feature: Round-robin spreads requests across the children

  A round-robin router hands eligible requests to its children in turn,
  skips a child that stands cooling, and never moves a chained turn to
  another account, because the turn's state lives with the account that
  began it.

  Background:
    Given a virtual model "fast" bound to a round-robin router over a first and a second target

  Scenario: Two requests reach two different targets
    When two requests arrive under "fast"
    Then each target receives one of them

  Scenario: A cooling child skips its turn
    Given the first target stands cooling from a rate limit
    When a request arrives under "fast"
    Then the second target receives the request
    And the first target receives nothing

  Scenario: A chained turn refuses rather than rotating
    When a chained turn arrives under "fast" carrying its previous response id
    Then the gateway answers a typed refusal naming the chained turn
    And no request leaves the machine
