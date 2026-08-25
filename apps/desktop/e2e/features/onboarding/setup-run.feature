@fresh-profile
Feature: The wizard builds the first gateway

  The wizard asks which harnesses a person works with, offers the sources it
  found on the machine beside the whole provider catalog, shows the graph it
  means to build, and then builds it.

  Background:
    Given the setup wizard standing on the harness step

  Scenario: The harness step refuses to continue with nothing picked
    Then the control that continues refuses

  Scenario: The harness step counts what a person picked
    When the person picks the "Claude Code" harness
    Then the control that continues reads "Continue with 1 harness"

  Scenario: The whole connect catalog stands under its own headings
    Then every heading of the connect catalog stands
    And a tile stands for every harness the catalog holds

  Scenario: The source step opens on what the machine already holds
    When the person picks the "Claude Code" harness and continues
    Then the source step stands
    And every column of the provider catalog stands

  Scenario: The source step refuses to continue with nothing marked
    When the person picks the "Claude Code" harness and continues
    Then the control that continues refuses
