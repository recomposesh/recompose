Feature: Reaching a gateway from a client

  The toolbar carries the guide that points a person's own tool at the gateway
  they are reading, written from that gateway rather than from a template.

  Background:
    Given a gateway holding a virtual model bound to a target

  Scenario: The guide opens on the gateway a person is reading
    When the person opens the connect guide
    Then the guide stands for that gateway

  Scenario: A block carries this gateway's own address and model
    When the person opens the connect guide
    Then the Claude Code block names the gateway address and the model id

  Scenario: A block hands over one command rather than settings the shell keeps
    When the person opens the connect guide
    Then the Claude Code block sets nothing that outlives the command

  Scenario: A client that owns the version segment is handed it
    When the person opens the connect guide and picks "Codex CLI"
    Then the address offered ends in the version segment

  @one-clipboard
  Scenario: A copied block lands on the clipboard whole
    When the person copies the Claude Code setup block
    Then the clipboard holds every line of that block
