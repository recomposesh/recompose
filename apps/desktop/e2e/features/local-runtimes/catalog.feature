Feature: The Local Runtimes catalog

  Background:
    Given the app is on the Local Runtimes screen

  Scenario: Adding a provider opens the catalog over the screen
    When the maintainer asks to add a provider
    Then the catalog opens over the screen, holding five servers
    And every server answers a pick

  Scenario: A runtime the release once deferred now looks at its documented port
    Given the catalog is open
    When the maintainer picks "LM Studio" in the catalog
    Then the look reports what stands at "127.0.0.1:1234"

  Scenario: A server nobody documents asks for the port it listens on
    Given the catalog is open
    When the maintainer picks "Custom local server" in the catalog
    Then the connect asks for a name and a port
    And it never asks for a host
