Feature: The Usage menu ranges

  The menu names every range the address accepts, moves the explorer
  the same way the on-screen control would, and spends the
  Option-modified numbers so the plain numbers stay on walking the app.

  Background:
    Given the app is on the usage screen

  Scenario: The menu lists every range the address accepts
    Then the Usage menu's range group names Last Hour, Last 24 Hours, Last 7 Days, Last 30 Days, This Week, This Month, and Custom Range

  Scenario: A menu pick moves the same address a press would
    Given the explorer stands on the last 24 hours
    When the person picks Last 7 Days from the Usage menu
    Then the address reads the same search the on-screen range control would write

  Scenario: The range shortcuts carry the Option modifier in address order
    Then the six preset ranges print 1 through 6 under the command and Option modifiers, in menu order
    And Custom Range prints no shortcut

  Scenario: A custom-range pick opens the calendar
    When the person picks Custom Range from the Usage menu
    Then the explorer stands on the custom window with its calendar open
