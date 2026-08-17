Feature: View menu navigation

  One item per top-level surface walks the app on the plain numbers,
  answers even when no window stands open, and lands the gateways pick
  where the home landing lands.

  Scenario: A pick lands the main window on providers
    Given the app is on the usage screen
    When the person picks Providers from the View menu
    Then the main window lands on the providers screen

  Scenario: The navigation items print the plain numbers in order
    Then Gateways, Providers, and Usage print 1, 2, and 3 under the command modifier

  Scenario: A pick answers with no window open
    Given the menu bar switch is on and the last window is closed
    When the person picks Usage from the View menu
    Then a window opens on the usage screen

  Scenario: The gateways pick lands on the last-looked-at gateway
    Given the person last looked at the gateway detail of "codex"
    And the app is on the usage screen
    When the person picks Gateways from the View menu
    Then the gateway detail of "codex" stands

  Scenario: The gateways pick lands on the empty state when none stands
    Given no gateway stands stored
    When the person picks Gateways from the View menu
    Then the gateways screen shows its empty state
