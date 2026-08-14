Feature: The inspector orders the router's children

  Under failover the child list reads as a ladder with a printed rank on
  every row, reordered from the keyboard as well as the pointer. Under
  round-robin the same list stands unordered.

  Scenario: The keyboard reorders the failover ladder
    Given the inspector open on a failover router over three targets
    When the person, with the keyboard alone, moves the third child up one rank
    Then the moved child's row prints rank 2
    And the live region announces "second of three"

  Scenario: A round-robin child list carries no rank
    Given a virtual model "fast" bound to a round-robin router over a first and a second target
    When the person selects the router node
    Then the inspector lists the children without rank numbers
