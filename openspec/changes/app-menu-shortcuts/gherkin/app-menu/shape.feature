Feature: The menu bar keeps its shape

  The route-scoped menus come and go with the surface, yet Window and
  Help close the menu bar on every route, and the checklist toggle
  lives under View because it shows a surface rather than configuring
  the app.

  Background:
    Given the app is on the gateways screen

  Scenario: Window and Help close the menu bar
    Then the menu bar ends with Window and then Help

  Scenario: Help keeps its trailing place while route menus come and go
    When the person visits the usage screen and then the providers screen
    Then the menu bar still ends with a Help menu

  Scenario: The checklist toggle lives under View alone
    Then the View menu carries the onboarding checklist item
    And no other menu carries it
