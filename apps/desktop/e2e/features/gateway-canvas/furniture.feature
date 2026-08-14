Feature: The minimap and zoom controls stand on the canvas

  The canvas ships a minimap mirroring the composition and zoom controls
  acting on the view, both drawn in the app's color scheme.

  Scenario: The minimap mirrors the composition
    Given a gateway holding a virtual model bound to a target
    When the person opens the gateway detail
    Then the minimap draws every node of the composition

  Scenario: A zoom control magnifies the view
    Given an open gateway detail holding a composition
    When the person presses the zoom-in control
    Then the canvas view magnifies
    And the nodes keep their arrangement

  Scenario: The furniture follows the dark scheme
    Given the app in the dark scheme
    When the person opens the gateway detail
    Then the minimap and the zoom controls draw in the dark scheme
