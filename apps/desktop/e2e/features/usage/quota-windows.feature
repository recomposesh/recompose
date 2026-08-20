Feature: Quota windows over the standing accounts

  The strip reads what this machine's own logs prove per subscription
  account. One address can sign into two plans at once, so each card
  heads with the plan product that burned.

  @seeded-subscription-burn
  Scenario: Two plans on one address read apart
    Given a previous session burned tokens on "Claude" and "Codex" under "dev@example.com"
    When the person opens the usage screen
    Then the quota windows show a "Claude" card and a "Codex" card
    And both cards carry the address "dev@example.com"
