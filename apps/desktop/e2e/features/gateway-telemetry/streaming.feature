Feature: Rows stream in live, newest at the top

  While the drawer stands open, served requests land as rows at the top of
  the list. Reading history never loses the place, and rows a person saw
  never vanish.

  Background:
    Given a running gateway "relay" serving the virtual model "creative"
    And an open logs drawer

  Scenario: A served request lands at the top
    When "relay" serves a request through "creative"
    Then a new row stands at the top of the list

  Scenario: Reading history holds its place
    Given the person scrolled down the list
    When "relay" serves a request
    Then the list holds its scroll place
    And the new row waits at the top

  Scenario: The header reads Live while the stream stands
    When the person reads the drawer header
    Then it heads "relay" as "Gateway" and reads Live

  Scenario: Stopping the gateway reads Stopped
    Given rows standing in the list
    When the person stops "relay"
    Then the header reads Stopped
    And the rows stay readable

  Scenario: Rows a person saw never vanish
    Given rows standing in the list
    When the person closes and reopens the drawer
    Then every row still stands
