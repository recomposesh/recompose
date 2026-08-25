@fresh-profile
Feature: The setup wizard meets a first session

  A profile that has never finished setup and never dismissed it meets the
  wizard over the whole window. Every other launch falls into the canvas. The
  wizard remembers nothing about where a person stood: it reads the step it
  opens on from what the profile already holds.

  Scenario: A profile that has never seen the wizard opens on welcome
    When the person launches recompose for the first time
    Then the setup wizard holds the whole window
    And it stands on the welcome step

  Scenario: Escape leaves setup where it stood
    Given the setup wizard standing on the welcome step
    When the person presses Escape
    Then the setup wizard still holds the whole window

  Scenario: A press outside the wizard leaves it standing
    Given the setup wizard standing on the welcome step
    When the person presses the surface behind the wizard
    Then the setup wizard still holds the whole window

  Scenario: Leaving setup hands the window back
    Given the setup wizard standing on the welcome step
    When the person leaves setup to explore on their own
    Then the canvas stands with no wizard over it
    And the get-started checklist stands on the canvas

  Scenario: A dismissed wizard stays away on the next launch
    Given a profile where the person left setup to explore on their own
    When the app launches again
    Then the canvas stands with no wizard over it

  Scenario: The View menu opens setup again
    Given a profile where the person left setup to explore on their own
    When the person opens setup from the View menu
    Then the setup wizard holds the whole window
