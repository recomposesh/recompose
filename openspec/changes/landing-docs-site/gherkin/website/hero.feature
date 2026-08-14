Feature: The hero answers the visitor's movement

  The landing page opens on an orchestra sitting in the dark. The visitor's own
  movement is what lights it, so the scene answers the person rather than
  playing at them.

  Scenario: a visitor lights the scene by moving across it
    Given a visitor has opened the landing page
    When they move the pointer across the hero
    Then the scene lights along the path they took
    And the light behind them fades back into the dark

  Scenario: a visitor who asked for reduced motion meets a still hero
    Given a visitor whose system asks for reduced motion
    When they open the landing page
    Then the hero holds a still frame
    And moving the pointer still lights the scene

  Scenario: turning reduced motion on stills a running loop
    Given a visitor is watching the hero with the loop playing
    When they turn on their system's reduced-motion preference
    Then the loop stops on a still frame without a reload

  Scenario: a visitor with no pointer still meets a lit scene
    Given a visitor on a touch screen
    When they open the landing page
    Then the reveal wanders the scene on its own

  Scenario: a refused loop leaves the scene visible
    Given a browser that refuses to play the loop
    When a visitor opens the landing page
    Then the hero holds the still frame
    And moving the pointer still lights the scene
