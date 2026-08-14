Feature: The first downstream byte commits the serving child

  Until the first byte reaches the caller the router may move to the next
  child. After it, the stream belongs to the child that began it, and no
  sibling begins.

  Background:
    Given a virtual model "fast" bound to a failover router over a first and a second target

  Scenario: A failure after the first downstream byte closes without moving on
    Given the first target has begun streaming its answer to the caller
    When that target's stream fails partway
    Then the stream closes
    And no other target receives the request

  Scenario: A transport failure carrying no status fails over
    When the connection to the first target drops carrying no status
    Then the second target receives the request
    And the answer travels back to the caller
