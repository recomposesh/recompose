Feature: A row tells one request's story

  Every row carries the request time, the method, the virtual model, the
  provider model it resolved to, the provider, the account, the status, and
  the duration. A failure reads at a glance.

  Background:
    Given a running gateway "relay" serving the virtual model "creative" bound to the Anthropic account "work"
    And an open logs drawer

  Scenario: A row carries the request's facts
    When "relay" serves a request through "creative" resolved to the provider model "sonnet"
    Then the row names "creative" and "sonnet"
    And it names "anthropic" and "work"
    And it carries the time, the status 200, and the duration

  Scenario: A provider failure reads at a glance
    When the provider answers a request with status 500
    Then the row marks the failure with status 500
    And its duration cell stands empty

  Scenario: A request that reaches no provider still lands
    Given "creative" bound to an unreachable target
    When "relay" fails the request
    Then a row carries status 502
    And its provider and account cells stand empty

  Scenario: A departed virtual model still names its rows
    Given rows served through "creative"
    When the person removes "creative" from the gateway
    Then the rows still name "creative"

  Scenario: Long names never hide the vitals
    Given "creative" resolved to a provider model with a long name
    When the person reads its row
    Then the time, the status, and the duration read in full

  Scenario: The keyboard walks the rows
    Given three rows standing in the list
    When the person steps down the list by keyboard
    Then the row cursor moves one row at a time

  Scenario: The focused row copies
    Given the row cursor standing on a row
    When the person copies the focused row
    Then the clipboard holds that row's facts
