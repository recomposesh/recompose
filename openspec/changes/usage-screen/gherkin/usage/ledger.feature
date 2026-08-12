Feature: Usage is an accounting record

  Served history outlives the session and the entities it names. A
  restart neither loses nor repeats a request, and forgetting a gateway
  never erases what it served.

  Background:
    Given a running gateway "relay" serving the virtual model "creative"

  Scenario: Served history survives a restart
    Given "relay" served 3 requests today
    When the app restarts
    Then the 24h view still counts 3 requests

  Scenario: Replayed history never double counts
    Given "relay" served 3 requests today
    When the app restarts twice
    Then the 24h view still counts exactly 3 requests

  Scenario: A forgotten gateway keeps its accounting
    Given "relay" served requests
    When the person forgets "relay"
    Then the breakdown still names "relay" with its served requests
