Feature: The provider catalog

  Background:
    Given the app is on the subscriptions screen

  Scenario: Adding a provider opens the catalog over the screen
    When the maintainer asks to add a provider
    Then the catalog opens over the screen, holding only subscription plans
    And every plan answers a pick

  Scenario: The plan no tool signs in shows the code to enter on GitHub
    Given the catalog is open
    When the maintainer picks "GitHub Copilot" in the catalog
    Then the step shows a code and the address to enter it at

  Scenario: A plan that issues a token asks for the token
    Given the catalog is open
    When the maintainer picks "GLM Coding Plan" in the catalog
    Then the connect asks for a name and a key

  Scenario: Picking a provider offers the one way the screen holds
    Given the catalog is open
    When the maintainer picks "anthropic"
    Then the sign-in stands alone, yielding an account for the provider's own tool
