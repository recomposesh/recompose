Feature: View menu surface toggles

  The sidebar and the inspector toggle from the View menu, each tick
  reading the state the screen reports back, and an item whose surface
  the standing route lacks dims rather than disappears.

  Scenario: The menu toggle hides the sidebar
    Given the app is on the gateways screen
    When the person picks the sidebar toggle from the View menu
    Then the sidebar leaves the screen
    And the menu tick reads off

  Scenario: The tick reads a hide made on screen
    Given the app is on the gateways screen
    When the person hides the sidebar from its on-screen toggle
    Then the View menu's sidebar tick reads off

  Scenario: The inspector toggles on the gateway detail
    Given a stopped gateway named "codex"
    And the person watches the gateway detail of "codex"
    When the person picks the inspector toggle from the View menu
    Then the inspector opens
    And the menu tick reads on

  Scenario: The inspector item dims off the canvas
    Given the app is on the providers screen
    Then the View menu shows the inspector item as unavailable rather than missing
