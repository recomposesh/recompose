Feature: The setup wizard meets a first session

  A profile that has never finished setup and never dismissed it meets the
  wizard over the whole window. Every other launch falls into the canvas. The
  wizard remembers nothing about where a person stood: it reads the step it
  opens on from what the profile already holds, and the View menu carries the
  way back in.

  Scenario: A profile that has never seen the wizard opens on welcome
    Given a profile that has never finished setup and never dismissed it
    When the person launches recompose
    Then the setup wizard holds the whole window
    And it stands on the welcome step

  Scenario: A dismissed wizard stays away
    Given the person dismissed the setup wizard
    When the person launches recompose again
    Then the canvas opens with no wizard over it

  Scenario: A profile that already runs a gateway never meets the wizard
    Given a profile holding the gateway "My Gateway" and the virtual model "claude-my-model"
    And that profile finished setup
    When the person launches recompose
    Then the canvas opens with no wizard over it

  Scenario: The View menu opens the wizard again
    Given a profile that finished setup
    When the person opens the setup wizard from the View menu
    Then the setup wizard holds the whole window
    And the profile still stands as having finished setup

  Scenario: A profile interrupted before its first request reopens on the wait
    Given a profile holding the gateway "My Gateway" and the virtual model "claude-my-model"
    And that profile has neither finished setup nor dismissed it
    When the person launches recompose
    Then the setup wizard stands on the step waiting for the first request

  Scenario: Escape leaves setup where it stood
    Given the setup wizard standing on the welcome step
    When the person presses Escape
    Then the setup wizard still stands on the welcome step
    And the profile stands as having neither finished setup nor dismissed it

  Scenario: The canvas behind the wizard takes no keyboard
    Given the setup wizard standing over the canvas
    When the person tabs past the wizard's last control
    Then focus lands back inside the setup wizard

  Scenario: The menu bar stands down behind the wizard
    Given the setup wizard standing over the canvas
    When the person opens the menu bar
    Then the route-scoped menus read as unavailable
    And the item that opens a gateway reads as unavailable
