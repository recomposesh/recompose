Feature: A downloaded update waits for the person

  The app downloads an update in the background and leaves the person's work
  alone. No window opens, no dialog interrupts, and nothing restarts until
  the person chooses it. The update card is the one place the waiting
  version shows, and it stands wherever the person navigates.

  Background:
    Given the app runs on a channel it updates itself

  Scenario: A download finishes while the person works
    When version 0.4.0 finishes downloading
    Then the app keeps running and takes no window focus
    And the update card names version 0.4.0

  Scenario: A version still downloading shows no card
    When version 0.4.0 is still downloading
    Then the interface offers no update card

  Scenario: The card outlives navigation
    Given version 0.4.0 finished downloading
    When the person moves to another page
    Then the update card still names version 0.4.0

  Scenario: The person chooses the restart
    Given version 0.4.0 finished downloading
    When the person chooses to restart
    Then the app installs the update and reopens on version 0.4.0
