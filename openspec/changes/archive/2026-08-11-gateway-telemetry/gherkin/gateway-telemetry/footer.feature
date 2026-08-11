Feature: The status footer reads the gateway's live traffic

  A slim bar under the canvas aggregates the last minute of traffic on its
  left and tallies the composition on its right. It always stands: an idle
  gateway reads zeros rather than hiding the footer.

  Background:
    Given a running gateway "relay" serving the virtual model "creative"

  Scenario: An idle gateway reads zeros
    Given "relay" has served no requests
    When the person opens the gateway detail
    Then the footer reads zero requests, zero client apps, and zero tokens per minute
    And no error count shows

  Scenario: Served traffic moves the aggregates without a refresh
    Given the person watches the gateway detail
    When "relay" serves a request through "creative"
    Then the footer reflects the request without a manual refresh

  Scenario: The window forgets traffic older than a minute
    Given "relay" served its last request over a minute ago
    When the person reads the footer
    Then every traffic aggregate reads zero

  Scenario: A failure surfaces the error count
    Given a footer showing no error count
    When "relay" fails a request
    Then the error count appears reading 1

  Scenario: Client apps count distinct sources
    Given "relay" served requests from two different client apps within the minute
    When the person reads the footer
    Then the footer counts 2 client apps

  Scenario: The tally counts nodes and wires
    Given "relay" serves two virtual models each bound to a target
    When the person reads the footer
    Then the tally counts 5 nodes and 4 wires

  Scenario: No cost figure ever shows
    Given "relay" served requests that consumed provider tokens
    When the person reads the footer
    Then no dollar figure appears
