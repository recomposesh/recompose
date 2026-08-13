Feature: Renewal follows where the account came from

  Scenario: An adopted credential nearing expiry renews through the owning tool
    Given a connected "anthropic" subscription adopted from the machine
    And its credential nears expiry
    When a request needs that account
    Then the provider's own tool renews the credential with no window shown
    And the app serves the request with what the store holds afterward

  Scenario: The owning tool renewed the credential elsewhere
    Given a connected "anthropic" subscription adopted from the machine
    And the provider's own tool renewed the credential since the last request
    When a request needs that account
    Then the app serves the request and asks for no sign-in

  Scenario: Two requests on an expiring adopted credential share one renewal
    Given a connected "anthropic" subscription adopted from the machine
    And its credential nears expiry
    When two requests need that account at once
    Then one renewal runs
    And the app serves both requests

  Scenario: Serving across an expiry keeps the person's own tool signed in
    Given a connected "anthropic" subscription adopted from the machine
    And the app served requests across the credential's expiry
    When the maintainer opens the provider's own tool afresh
    Then that tool asks for no sign-in

  Scenario: The owning tool has gone
    Given a connected "anthropic" subscription adopted from the machine
    And the "anthropic" command-line tool isn't installed
    When its credential expires
    Then the account reports itself lapsed
    And the credential stands as it was

  Scenario: A renewal that fails leaves the credential alone
    Given a connected "anthropic" subscription adopted from the machine
    And its credential nears expiry
    And the provider's own tool fails to renew
    When a request needs that account
    Then the account reports itself lapsed
    And the credential stands as it was

  Scenario: The app renews an account it signed in
    Given a connected "anthropic" subscription
    And its credential nears expiry
    When a request needs that account
    Then the app renews the credential itself
    And the app serves the request
