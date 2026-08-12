Feature: One journey through the usage explorer

  The explorer reads what the machine served: live traffic fills the
  tiles, the ledger outlives the session, a summary deep-links into the
  scoped view, and a shortened retention prunes for good.

  Background:
    Given a running gateway "relay" serving the virtual model "creative"

  Scenario: Served traffic fills the live hour
    Given the person watches the live hour of the usage screen
    When "relay" serves a request through "creative"
    Then the requests tile counts 1
    And the breakdown names "relay"

  @seeded-usage-history
  Scenario: A restart keeps the figures
    Given a previous session recorded 3 requests through "relay"
    And the person watches the usage screen
    When the app restarts
    Then the restarted usage screen still counts 3 requests

  @seeded-usage-history
  Scenario: A summary deep-links into the scoped explorer
    Given a previous session recorded 3 requests through "relay"
    When the person follows the usage summary on the gateway detail of "relay"
    Then the usage screen opens scoped to "relay"

  @seeded-usage-history
  Scenario: A shortened retention prunes the ledger for good
    Given a previous session recorded requests through "relay" 20 days ago
    And the maintainer shortened usage retention to 7 days, accepting its cost
    When "relay" serves a request through "creative"
    Then the ledger holds nothing older than 7 days
    And the newest day's figures still stand
