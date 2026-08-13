Feature: Detecting what the machine holds

  Background:
    Given the app is on the subscriptions screen

  Scenario: Nothing on the machine to adopt
    Given the "anthropic" tool never signed in on this machine
    When the maintainer picks "anthropic"
    Then the catalog offers the sign-in and says the machine holds nothing

  Scenario: A credential store that refuses to open is not an empty machine
    Given the operating system refuses to open the credential store
    When the maintainer picks "anthropic"
    Then the catalog says it couldn't read the store
    And it does not claim the machine holds nothing
    And it offers a way to try again

  Scenario: A record that carries no account credential offers nothing
    Given the machine holds an "anthropic" record that carries no account credential
    When the maintainer picks "anthropic"
    Then the catalog offers nothing to adopt
    And it does not claim the machine holds nothing

  Scenario: A key-mode "openai" record is not a subscription
    Given the "openai" tool holds a key on this machine rather than a subscription
    When the maintainer picks "openai"
    Then the catalog offers nothing to adopt

  Scenario: A credential that lapsed reads apart from an absent one
    Given the "anthropic" tool signed in on this machine
    And the credential it left has since lapsed
    When the maintainer picks "anthropic"
    Then the catalog names the account it found and reports the lapse
    And it does not claim the machine holds nothing

  Scenario: Two stores that disagree yield the fresher record
    Given the machine holds the "anthropic" account in two stores that disagree
    When the maintainer picks "anthropic"
    Then the catalog offers the account from the fresher store

  Scenario: An "openai" credential in the keyring rather than the file still counts
    Given the "openai" tool signed in on this machine as "dev@example.com" on the "Pro" plan
    And it keeps its credential in the operating system keyring rather than the file
    When the maintainer picks "openai"
    Then the catalog offers the account it found, named "dev@example.com" on the "Pro" plan

  Scenario: A second look asks the operating system for nothing new
    Given the operating system asks before the credential store opens
    And the maintainer saw what the machine holds for "anthropic" once
    When the maintainer picks "anthropic" a second time
    Then no new permission prompt appears
