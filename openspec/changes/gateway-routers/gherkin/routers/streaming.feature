Feature: The first downstream byte commits the serving child

  An upstream 200 proves nothing, because a stream can open with an error
  event. Until the first byte reaches the caller the router may move to the
  next child. After it, the stream belongs to the child that began it, and
  the caller hears the provider's own error.

  Background:
    Given a virtual model "fast" bound to a failover router over a first and a second target

  Scenario: An error event before the first downstream byte fails over
    When the first target's stream opens with an error event before any byte reaches the caller
    Then the second target receives the request
    And the answer travels back to the caller

  Scenario: A failure after the first downstream byte forwards verbatim and closes
    Given the first target has begun streaming its answer to the caller
    When that target's stream fails partway
    Then the caller receives the provider's stream error unchanged
    And the stream closes
    And no other target receives the request

  Scenario: A transport failure carrying no status fails over
    When the connection to the first target drops carrying no status
    Then the second target receives the request
    And the answer travels back to the caller
