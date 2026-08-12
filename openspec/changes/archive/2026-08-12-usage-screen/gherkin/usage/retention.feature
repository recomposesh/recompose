Feature: The retention window guards its own cost

  A settings row keeps 7, 30, or 90 days of usage. Widening costs
  nothing. Shortening drops history for good, so the change waits until
  the maintainer accepts that cost.

  Background:
    Given the app is on the settings screen

  Scenario: The Data section offers three windows with 30 standing
    Then the Data section carries a usage retention control offering 7, 30, and 90 days
    And 30 days stands selected

  Scenario: Widening the window asks nothing
    When the maintainer widens retention to 90 days
    Then the change applies with no confirmation

  Scenario: A shortening that would drop history states its cost
    Given 30 days of served history stands
    When the maintainer shortens retention to 7 days
    Then a confirmation names the history a shorter window drops
    And the change holds until the maintainer answers

  Scenario: Declining keeps the window and the history
    Given a shortening to 7 days awaits its confirmation
    When the maintainer declines
    Then retention stays at 30 days
    And no history leaves

  Scenario: Accepting prunes with no way back
    Given a shortening to 7 days awaits its confirmation
    When the maintainer accepts
    Then usage older than 7 days leaves for good
