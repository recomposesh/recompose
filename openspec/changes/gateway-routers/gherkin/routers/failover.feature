Feature: Failover walks the children in declared order

  A failover router offers the request to its first child and moves on only
  when another child could cure the refusal. A refusal wrong with the request
  itself ends the walk, a credential failure cools one child alone, and no
  child is ever attempted twice.

  Background:
    Given a virtual model "fast" bound to a failover router over a first and a second target

  Scenario: A rate-limited first target hands the request to the next
    When the first target refuses the request with a rate limit
    Then the second target receives the request
    And the answer travels back to the caller

  Scenario: A malformed request stops at the first target
    When the first target refuses the request as malformed
    Then the caller receives that refusal unchanged
    And the second target receives nothing

  Scenario: A credential refusal cools that child alone
    When the first target refuses the request with a credential failure
    Then the second target answers the request
    And only the first target stands cooling

  Scenario: A refused walk attempts each child once
    When both targets refuse the request with rate limits
    Then each target receives exactly one attempt
    And the caller receives one refusal
