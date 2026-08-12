Feature: The quota strip claims only what local logs can prove

  Per subscription account, the strip shows 5-hour and weekly window burn
  derived from local logs. The gauge track never rescales, records move a
  marker, and no copy claims an official quota.

  Background:
    Given a running gateway "relay" serving the virtual model "creative" through a connected "anthropic" subscription

  Scenario: The gauge fills a fixed track toward the record
    Given the subscription burned 1.2M tokens in the current 5-hour window
    And its busiest 5-hour window on record burned 2.0M on 3 August
    When the person reads the account's 5-hour gauge
    Then the fill draws the burn on a fixed track, with a marker at the 2.0M record and its date

  Scenario: A record window says so instead of claiming exhaustion
    Given the current 5-hour window burned more than any window on record
    When the person reads the account's 5-hour gauge
    Then the copy says this window is the busiest on record
    And no full bar claims exhaustion

  Scenario: Every figure names its derivation
    When the person reads the quota strip
    Then the copy names local logs on UTC hour boundaries as the source
    And nothing claims an official remaining quota

  Scenario: The reset countdown reads as approximate
    When the person reads the account's 5-hour gauge
    Then the reset countdown carries the approximation prefix

  Scenario: The weekly gauge shows burn without a countdown
    When the person reads the account's weekly gauge
    Then the burn shows with no reset countdown
