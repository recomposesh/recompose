Feature: The key catalog

  Background:
    Given the app is on the API Keys screen

  Scenario: Adding a provider opens the catalog over the screen
    When the maintainer asks to add a provider
    Then the catalog opens over the screen, holding nine entries
    And every entry answers a pick

  Scenario: Nothing in the catalog stands inert
    Given the catalog is open
    Then no entry carries a Soon badge

  Scenario: An entry the release once deferred now opens its own connect
    Given the catalog is open
    When the maintainer picks "Gemini API" in the catalog
    Then the connect asks for a name and a key

  Scenario: The escape hatch asks for the address nothing documents
    Given the catalog is open
    When the maintainer picks "Custom endpoint" in the catalog
    Then the connect asks for a base URL and a dialect beside the name and the key

  Scenario: One act leads into the catalog
    Then the act that adds a provider stands at the trailing edge of the window strip
