Feature: An aggregator balance is a reading at a moment

  OpenRouter credits print as an account balance read at a stamped time,
  never as a live counter. A failed read keeps the last balance honest.

  Background:
    Given a connected "OpenRouter" key named "build"

  Scenario: The credits card stamps when it read
    When the person reads the credits card on the usage screen
    Then the balance for "build" prints beside when it was read

  Scenario: A failed refresh keeps the last reading
    Given the credits card holds a reading
    And OpenRouter cannot be reached
    When the person refreshes the credits card
    Then the last balance stays with its read-at stamp
    And the card names the failure beside its refresh control
