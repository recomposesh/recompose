Feature: A served request finishes setup

  The wizard waits on the last step for a request a client sends through the
  gateway. Only an answer the gateway recorded as served finishes it. A stored
  credential proves nothing, because a provider can turn one away the first
  time a client spends it.

  Background:
    Given the setup wizard standing on the step waiting for the first request
    And the gateway "My Gateway" serving the virtual model "claude-my-model"

  Scenario: A served request resolves the wizard into the canvas
    When "Claude Code" sends a request that the gateway records as served
    Then the setup wizard leaves the window
    And the graph the wizard built stands on the canvas

  Scenario: A refused request leaves the wizard waiting
    When "Claude Code" sends a request that the gateway records as failed
    Then the setup wizard still stands on the step waiting for the first request

  Scenario: A request still answering leaves the wizard waiting
    When "Claude Code" sends a request the gateway records as live
    Then the setup wizard still stands on the step waiting for the first request

  Scenario: A request that finishes answering resolves the wizard
    Given a request the gateway recorded as live
    When that request ends and the gateway records it as served
    Then the setup wizard leaves the window

  Scenario: Connecting another account finishes nothing
    When the person connects an Anthropic API key
    Then the setup wizard still stands on the step waiting for the first request

  Scenario: A settings file that refuses a write still lets the person through
    Given the settings file refuses a write
    When "Claude Code" sends a request that the gateway records as served
    Then the setup wizard leaves the window
    And the next launch stands on the step waiting for the first request

  Scenario: The wizard says where to send the request
    Then the waiting step reads the gateway's own address
    And it offers the way back to the commands

  Scenario: A person who asked for less motion still reaches the canvas
    Given a person whose system asks for reduced motion
    When "Claude Code" sends a request that the gateway records as served
    Then the setup wizard leaves the window
    And nothing on the canvas animates
