Feature: The usage screen reads the machine's served traffic

  One explorer answers what the machine served: tiles headline the window,
  the selected tile drives the chart, and the breakdown drills the domain
  hierarchy. Every reading also exists as printed text.

  Background:
    Given a running gateway "relay" serving the virtual model "creative"

  Scenario: Before any traffic the promise card stands alone
    Given nothing has ever been served
    When the person opens the usage screen
    Then the card promising rate, latency, tokens, and spend stands as the whole body
    And no tile, chart, or table renders

  Scenario: A served request lands in the tiles
    Given the person watches the usage screen
    When "relay" serves a request through "creative"
    Then the requests tile counts 1
    And the tokens tile splits the cached share from the uncached

  Scenario: A served request lands in the breakdown
    Given the person watches the usage screen
    When "relay" serves a request through "creative"
    Then the breakdown names "relay" with its request count and share

  Scenario: A tile selects what the chart draws
    Given "relay" has served requests
    When the person selects the errors tile
    Then the chart draws the error series
    And the chart's series label reads as the tile's label

  Scenario: The latency reading names its statistic
    Given "relay" has served requests
    When the person selects the latency tile
    Then the tile face and the chart caption both name the figure an average

  Scenario: The caption states what the chart claims
    Given "relay" has served requests
    When the person reads the chart caption
    Then it states the range, the bucket width, the total, and the peak
    And it says day boundaries follow UTC

  Scenario: The table twin prints every reading as text
    Given "relay" has served requests
    When the person discloses the chart's data table
    Then every bucket the chart draws prints as a row of text values
