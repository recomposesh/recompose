Feature: The Aggregators catalog

  Background:
    Given the app is on the Aggregators screen

  Scenario: Adding a provider opens the catalog over the screen
    When the maintainer asks to add a provider
    Then the catalog opens over the screen, holding eight hosted catalogs
    And every hosted catalog answers a pick

  Scenario: A hosted catalog the release once deferred now opens its own connect
    Given the catalog is open
    When the maintainer picks "Cerebras" in the catalog
    Then the connect asks for a name and a key
