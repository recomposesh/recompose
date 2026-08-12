Feature: Cost tells the truth about its basis

  Billed traffic shows estimated cost, subscription traffic shows an
  equivalent figure marked approximate, and local traffic costs nothing.
  The two figures never merge, and a small or unpriced number never
  hides behind a zero.

  Background:
    Given a running gateway "relay" serving the virtual model "creative"

  Scenario: Billed and equivalent never merge
    Given "relay" served today's requests through both an API-key account and a subscription account
    When the person reads today's spend
    Then billed and equivalent print as two labelled lines
    And no figure adds them together

  Scenario: Equivalent cost always reads as approximate
    Given "relay" served requests through a connected "anthropic" subscription
    When the person reads the spend tile
    Then the equivalent figure carries the approximation prefix
    And a screen reader hears it as about the amount

  Scenario: Local traffic carries no cost
    Given "relay" served requests through a local runtime
    When the person reads the spend breakdown
    Then the local traffic shows no cost figure at all

  Scenario: A sub-cent day never prints zero dollars
    Given the billed traffic of "relay" cost less than one cent today
    When the person reads today's spend
    Then it reads as less than one cent, never as zero dollars

  Scenario: An unpriced model stays visible by name
    Given "relay" served a model the price map cannot price
    When the person reads the spend view
    Then that model surfaces by name with its request count
    And no zero-dollar figure stands in for it
