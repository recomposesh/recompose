Feature: Summary cards deep-link into the usage screen

  Gateway and provider surfaces carry compact usage summaries that open
  the explorer pre-filtered. A card reading zero never links into an
  empty view.

  Scenario: A summary card lands pre-filtered
    Given a running gateway "relay" that has served requests
    When the person follows the usage summary on the gateway detail of "relay"
    Then the usage screen opens scoped to "relay"
    And the readings cover only "relay"

  Scenario: A zero card offers no dead end
    Given a running gateway "quiet" that has served nothing
    When the person reads the gateway detail of "quiet"
    Then the usage summary reads zero
    And it carries no link into the usage screen
