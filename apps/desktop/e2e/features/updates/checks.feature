@update-feed
Feature: An update check answers the person who asked for it

  A check nobody asked for stays out of the way. It leaves the app running,
  raises nothing, and reaches the log with its reason and the feed it tried.
  Checking starts at launch and repeats on an interval. A check a person
  chose answers back instead, a refusal included, in the sidebar rather than
  a dialog.

  Background:
    Given the app runs on a channel it updates itself

  @update-feed-refuses
  Scenario: The release feed refuses a check
    Given the release feed answers with an error
    When the app checks for an update
    Then the app keeps running and raises no dialog
    And the log carries the reason and the feed address

  Scenario: The app checks at launch
    When the app starts
    Then it checks the release feed once

  @update-checks-fast
  Scenario: The app keeps checking
    Given the app has run past its launch check
    When the check interval elapses
    Then it checks the release feed again

  Scenario: A person checks and hears that nothing newer waits
    When the person checks for updates
    Then the app reports the running version is the newest

  @update-feed-refuses
  Scenario: A refusal the person asked for says so
    Given the release feed answers with an error
    When the person checks for updates
    Then the app reports the check failed and names the reason
    And the app keeps running and raises no dialog
