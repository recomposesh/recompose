Feature: A failed update check stays out of the way

  A check that fails leaves the app running and raises nothing. The failure
  reaches the log with its reason and the feed it tried, so a maintainer can
  read what happened. Checking starts at launch and repeats on an interval.

  Background:
    Given the app runs on a channel it updates itself

  Scenario: The release feed refuses a check
    Given the release feed answers with an error
    When the app checks for an update
    Then the app keeps running and raises no dialog
    And the log carries the reason and the feed address

  Scenario: The app checks at launch
    When the app starts
    Then it checks the release feed once

  Scenario: The app keeps checking
    Given the app has run past its launch check
    When the check interval elapses
    Then it checks the release feed again
