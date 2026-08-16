Feature: The Gateway menu drives the standing gateway

  While a gateway detail stands, the menu starts, stops, and restarts
  that gateway under the tray's enablement rule, copies its base URL,
  and deletes only through the confirmation the canvas already asks.

  Scenario: Start serves the still gateway
    Given a stopped gateway named "codex"
    And the person watches the gateway detail of "codex"
    When the person picks Start Gateway from the Gateway menu
    Then "codex" starts answering
    And the menu's Stop Gateway and Restart Gateway items enable

  Scenario: A still gateway dims Stop and Restart
    Given a stopped gateway named "codex"
    When the person opens the gateway detail of "codex"
    Then the Gateway menu offers Start Gateway
    And it shows Stop Gateway and Restart Gateway as unavailable

  Scenario: A running gateway dims Start
    Given a running gateway named "codex"
    When the person opens the gateway detail of "codex"
    Then the Gateway menu offers Stop Gateway and Restart Gateway
    And it shows Start Gateway as unavailable

  Scenario: Stop from the menu stops the gateway
    Given a running gateway named "codex"
    And the person watches the gateway detail of "codex"
    When the person picks Stop Gateway from the Gateway menu
    Then "codex" stops answering

  Scenario: Copy Base URL fills the clipboard
    Given a running gateway named "codex"
    And the person watches the gateway detail of "codex"
    When the person picks Copy Base URL from the Gateway menu
    Then the clipboard holds the base URL of "codex"

  Scenario: Delete still asks first
    Given a stopped gateway named "codex"
    And the person watches the gateway detail of "codex"
    When the person picks Delete Gateway from the Gateway menu
    Then the same confirmation the canvas offers appears
    And nothing leaves until the person answers
