Feature: The drawer shares the workspace without covering it

  The drawer stands under the stage in the canvas column. The canvas shrinks
  and stays fully usable above it, while the inspector keeps its own
  full-height column beside both. The drawer's height drags and persists.

  Background:
    Given a running gateway "relay" serving the virtual model "creative"
    And an open logs drawer

  Scenario: The canvas keeps its furniture
    When the person reads the canvas above the drawer
    Then the zoom controls and the minimap stand visible

  Scenario: The logs and inspector keep separate columns
    When the person selects the node of "creative"
    Then the logs stay left of the full-height inspector

  Scenario: The canvas stays live under an open drawer
    When the person selects the node of "creative"
    Then the node takes selection

  Scenario: The height drags
    When the person drags the drawer's top edge upward
    Then the drawer stands taller

  Scenario: The height survives reopening
    Given the person dragged the drawer taller
    When the person closes and reopens the drawer
    Then the drawer stands at the dragged height

  Scenario: Dragging far down closes the drawer
    When the person drags the top edge well below the smallest height
    Then the drawer closes
    And the footer stands as before
