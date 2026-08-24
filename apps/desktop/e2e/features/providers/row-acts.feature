Feature: A provider row offers its acts to a right-click

  Each account row keeps its quieter acts behind one control at its trailing
  edge. A right-click on the row raises that same list, so neither way in can
  drift from the other.

  Background:
    Given the app is on the API keys screen
    And a connected "Anthropic API" key named "build"

  Scenario: A right-click offers the acts the trailing control holds
    When the person right-clicks the account row
    Then the row menu reads the same acts as the row's own control

  Scenario: Removing from the row's menu takes the account out
    When the person right-clicks the account row
    And the person takes "Remove" off the row menu
    Then the account leaves the list
