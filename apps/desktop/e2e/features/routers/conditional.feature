Feature: Conditional routes each request down the branch the judge names

  A conditional router asks its judge to read the request and answer with
  one branch label. The call carries every label beside its rule, a broken
  answer earns a single retry, and a judge that never answers at all refuses
  the request rather than handing it to a child nothing chose.

  Background:
    Given a virtual model "fast" bound to a conditional router with a "code" branch, a "chat" branch, and an else branch

  Scenario: The judge sends a matching request down its branch
    When a request arrives that the judge classifies as "code"
    Then the child behind the "code" branch receives the request
    And the answer travels back to the caller

  Scenario: The classification call carries each label beside its rule
    Given the "code" branch ruled "questions about source code" and the "chat" branch ruled "everyday conversation"
    When a request arrives under "fast"
    Then the classification call carries each branch's label beside its rule text
    And else stands nowhere among the offered labels

  Scenario Outline: A broken answer earns one retry and a second lands on else
    Given the judge answers with <broken answer> on every call
    When a request arrives under "fast"
    Then the judge receives exactly two classification calls
    And the child behind the else branch receives the request

    Examples:
      | broken answer                 |
      | text matching no branch label |
      | two branch labels at once     |
      | an empty completion           |
      | a label cut short partway     |
      | the word "else"               |

  Scenario: A clean answer on the retry still routes down its branch
    Given the judge answers with two branch labels at once, then "code" on the retry
    When a request arrives under "fast"
    Then the judge receives exactly two classification calls
    And the child behind the "code" branch receives the request

  Scenario: A retry the judge never answers refuses, though the first ask did answer
    Given the judge answers with text matching no branch label, then nothing at all
    When a request arrives under "fast"
    Then the judge receives exactly two classification calls
    And no child of the router receives the request

  Scenario: A judge past its timeout budget refuses rather than falling to else
    Given the judge doesn't answer within the timeout budget
    When a request arrives under "fast"
    Then no child of the router receives the request
    And the caller reads a refusal saying the judge ran past its timeout

  Scenario: The timeout clock covers the wait for the judge's first byte
    Given the judge sends its first byte only after the timeout budget
    When a request arrives under "fast"
    Then no child of the router receives the request
    And the judge's late answer moves no traffic
