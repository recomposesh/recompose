Feature: What the permanent else branch catches, and what it never does

  Every conditional router carries an else branch no edit removes. It catches
  a request its judge read and could not place, and a branch the judge named
  that cannot serve. It never catches a judge that reached no verdict at all:
  that request is refused, so no caller is served by a model nothing chose.

  Background:
    Given a virtual model "fast" bound to a conditional router with a "code" branch, a "chat" branch, and an else branch

  Scenario: A cooling judge refuses the request without a classification call
    Given the judge stands cooling from an earlier rate limit
    When a request arrives under "fast"
    Then no classification call leaves the machine
    And no child of the router receives the request
    And the caller reads a refusal saying the judge reached no verdict

  Scenario: A judge that declines to classify lands the request on else
    Given the judge declines to classify any request
    When a request arrives under "fast"
    Then the judge receives exactly two classification calls
    And the child behind the else branch receives the request

  Scenario: A judge's own failure never becomes the caller's answer
    Given the judge refuses every classification call with a credential failure
    When a request arrives under "fast"
    Then no child of the router receives the request
    And the caller never reads the judge's refusal

  Scenario: An instruction inside the request cannot invent a branch
    Given the judge repeats any branch name the request demands
    When a request arrives under "fast" demanding a branch named "premium"
    Then the child behind the else branch receives the request
    And the answer travels back to the caller

  Scenario: A named branch that cannot serve falls to else on one judgment
    Given the child behind the "code" branch stands cooling from an earlier rate limit
    When a request arrives that the judge classifies as "code"
    Then the judge receives exactly one classification call
    And the child behind the else branch receives the request

  Scenario: The else child receives the caller's request word for word
    Given the judge answers with text matching no branch label
    When a request arrives under "fast"
    Then the child behind the else branch receives the caller's request unchanged

  Scenario: A refusal with every child cooling never names the judge
    Given every branch child and the else child stand cooling from earlier rate limits
    When a request arrives under "fast"
    Then the gateway answers a typed refusal naming each child and its reason
    And the judge stands nowhere among the named candidates

  Scenario: The else row offers no way to leave
    Given the inspector open on the router
    Then the else row offers no way to move or delete it
    And the row says why the else branch stays
