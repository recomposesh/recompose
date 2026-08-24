Feature: The toolbar's control opens the logs drawer

  The footer stays passive, selectable text, and carries no control of its
  own. The request log control on the toolbar opens the drawer, the Gateway
  menu carries the same command as its twin, and a double-click on the empty
  run of the footer turns the drawer over as well.

  Background:
    Given the gateway detail of a running gateway "relay"

  Scenario: The request log control opens the drawer
    Given the logs drawer stands closed
    When the person presses the request log control on the toolbar
    Then the logs drawer opens under the stage

  Scenario: The close control returns the drawer
    Given an open logs drawer
    When the person takes the close control
    Then the drawer leaves
    And the footer stands as before

  Scenario: The keyboard alone opens the drawer
    Given the logs drawer stands closed
    When the person opens the drawer using only the keyboard
    Then the logs drawer stands open

  Scenario: Show Logs in the Gateway menu opens the drawer
    Given the logs drawer stands closed
    When the person picks "Show Logs" from the Gateway menu
    Then the logs drawer opens
    And the menu item reads checked

  Scenario: Show Logs closes what it opened
    Given the drawer stands open through the menu
    When the person picks "Show Logs" again
    Then the drawer leaves

  Scenario: A double-click on the empty footer opens the drawer
    Given the logs drawer stands closed
    When the person double-clicks the empty run of the footer
    Then the logs drawer opens

  Scenario: A double-click on the empty footer closes what it opened
    Given an open logs drawer
    When the person double-clicks the empty run of the footer
    Then the drawer leaves

  Scenario: A double-click on a reading picks a word instead
    Given the logs drawer stands closed
    When the person double-clicks a footer reading
    Then the drawer stays closed
    And the word under the press stands selected

  @one-clipboard
  Scenario: The footer reading copies as text
    Given a footer reading live traffic
    When the person selects the footer text and copies it
    Then the clipboard holds the reading
