Feature: The scope path narrows the page and lives in the address

  The active scope draws as a path over the domain hierarchy: gateway,
  virtual model, real model, provider, account. Pressing a segment
  truncates to it, the address carries the whole view, and an empty
  scope names its own way out.

  Background:
    Given a running gateway "relay" serving the virtual model "creative"
    And "relay" has served requests

  Scenario: Drilling a breakdown row narrows the scope
    When the person breaks down the "relay" row by virtual model
    Then the scope path reads all traffic, then "relay"
    And the breakdown regroups by virtual model

  Scenario: Pressing a path segment truncates the scope to it
    Given the scope stands at "relay" then "creative"
    When the person presses the "relay" segment
    Then "creative" leaves the scope
    And every reading widens to all of "relay"

  Scenario: The root segment clears every level
    Given the scope stands at "relay" then "creative"
    When the person presses the all-traffic segment
    Then the page reads all traffic with no scope standing

  Scenario: Back walks the drill history
    Given the person drilled into "relay" and then into "creative"
    When the person goes back
    Then the scope stands at "relay" alone

  Scenario: A reload lands on the same view
    Given the person drilled into "relay" with the range at 7d
    When the screen reloads
    Then the same scope, range, and metric stand

  Scenario: A scope with no traffic names its recovery
    Given a running gateway "quiet" that served nothing in the last 7 days
    When the person scopes to "quiet" over the 7d range
    Then the page reads "Nothing served through this gateway in the last 7 days"
    And it offers clearing the scope or widening the range

  Scenario: Clearing the scope brings the readings back
    Given "quiet" stands scoped with nothing served in the range
    When the person clears the deepest scope level
    Then the chart and the breakdown return with all traffic
