Feature: The zoom group splits resetting from fitting

  Returning to 100% and fitting the composition are different asks, so
  each holds its own item: the plain reset shortcut lands on 100%, the
  shifted variant fits, and Tidy Up carries a shortcut of its own.

  Background:
    Given a stopped gateway named "codex"
    And the person watches the gateway detail of "codex"

  Scenario: Actual Size lands the canvas at 100%
    Given the person zoomed the canvas away from 100%
    When the person picks Actual Size from the Gateway menu
    Then the canvas stands at 100%

  Scenario: Zoom to Fit brings the whole composition into view
    Given the person zoomed the canvas away from 100%
    When the person picks Zoom to Fit from the Gateway menu
    Then the canvas fits the whole composition in view

  Scenario: Actual Size sits on the plain 0 and its shifted variant on fit
    Then Actual Size prints 0 under the command modifier
    And Zoom to Fit prints 0 under the command and shift modifiers

  Scenario: Tidy Up carries its own shortcut
    Then Tidy Up prints an Option-modified shortcut no other item on the route claims
