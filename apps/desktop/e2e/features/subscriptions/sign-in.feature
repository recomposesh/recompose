Feature: Signing in through the provider's own tool

  Background:
    Given the app is on the subscriptions screen

  Scenario: The provider's own tool performs the sign-in
    Given the "anthropic" command-line tool is installed
    When the maintainer connects an "anthropic" subscription by signing in
    Then the app hands the sign-in to the provider's own tool
    And the account appears once that tool reports success

  Scenario: Signing in rather than adopting skips the first-run questions
    Given the "anthropic" command-line tool is installed
    And the "anthropic" tool signed in on this machine as "old@example.com" on the "Pro" plan
    When the maintainer connects an "anthropic" subscription by signing in
    Then the tool asks only what it needs to sign in
    And it skips the questions it asks on a first run

  Scenario: A sign-in leaves the person's own login alone
    Given the "anthropic" command-line tool is installed
    And the "anthropic" tool signed in on this machine as "old@example.com" on the "Pro" plan
    When the maintainer connects an "anthropic" subscription by signing in
    Then the machine's own login still reads "old@example.com"

  Scenario: Signing the same address in again writes over the account
    Given a connected "anthropic" subscription
    When the maintainer connects an "anthropic" subscription by signing in
    Then the screen lists one subscription account

  Scenario: An absent tool is a stated reason
    Given the "anthropic" command-line tool isn't installed
    When the maintainer chooses to sign in to "anthropic"
    Then the surface names the missing tool and what to do about it
    And no sign-in begins
