Feature: The wizard builds the first gateway

  The wizard asks which harnesses a person works with, offers the sources it
  found on the machine beside the whole provider catalog, shows the graph it
  means to build, and then builds it. Each step refuses to continue until it
  holds what the next one needs.

  Background:
    Given the setup wizard standing on the harness step

  Scenario: The harness step refuses to continue with nothing picked
    When the person picks no harness
    Then the control that continues refuses

  Scenario: The harness step counts what a person picked
    When the person picks "Claude Code" and "Cursor"
    Then the control that continues reads "Continue with 2 harnesses"

  Scenario: The machine's own plan and runtime arrive already marked
    Given the machine signs into a Claude plan as "alpcan@alpcanaydin.com"
    And Ollama answers on "127.0.0.1:11434"
    When the person reaches the source step
    Then both stand marked under the person's sources
    And the control that continues reads "Continue with 2 sources"

  Scenario: The source step refuses to continue with nothing marked
    Given the machine signs into no plan and runs no local runtime
    When the person reaches the source step
    Then nothing stands under the person's sources
    And the control that continues refuses

  Scenario: Clearing a mark keeps the row and drops the count
    Given the source step standing with a Claude plan and Ollama marked
    When the person clears the mark on Ollama
    Then the Ollama row still reads "127.0.0.1:11434"
    And the control that continues reads "Continue with 1 source"

  Scenario: Connecting a provider from the catalog adds a source
    Given the source step standing with a Claude plan and Ollama marked
    When the person connects OpenRouter through its own sheet
    Then a row for OpenRouter stands marked
    And the control that continues reads "Continue with 3 sources"

  Scenario: The compose step shows the graph before it builds it
    Given the source step standing with a Claude plan and Ollama marked
    When the person continues to the compose step
    Then it shows "claude-my-model" behind a round-robin router
    And the router deals between one model from the Claude plan and one from Ollama

  Scenario: A single source still gets a router
    Given the source step standing with only Ollama marked
    When the person continues to the compose step
    Then it shows a round-robin router with Ollama behind it

  Scenario: The name drops its prefix without Claude Code
    Given the person picked only "Cursor" on the harness step
    And the source step standing with only Ollama marked
    When the person continues to the compose step
    Then the virtual model reads "my-model"

  Scenario: Every job reports itself as the wizard builds
    Given the compose step standing over a Claude plan and Ollama
    When the person creates the graph
    Then the connected accounts read as finished
    And the gateway and the virtual model read as finished in turn
    And the wizard offers the way on to pointing the harnesses

  Scenario: A refused job halts the run and offers a retry
    Given the compose step standing over a Claude plan and Ollama
    And the machine refuses to open a gateway
    When the person creates the graph
    Then the gateway job carries the reason it refused
    And the virtual model job still reads as waiting
    And the wizard offers a way to try again

  Scenario: Trying again keeps what already stood
    Given a run where the gateway refused after both accounts connected
    When the person tries again
    Then both accounts still read as finished

  Scenario: The pointing step opens the first harness and closes the rest
    Given the person picked "Claude Code" and "Cursor"
    And a run that finished every job
    When the person reaches the step that points harnesses
    Then it carries an entry for each harness
    And the entry for "Claude Code" stands open

  Scenario: The commands carry the gateway the wizard just built
    Given a run that opened the gateway "My Gateway" on a port the machine had free
    When the person reads the commands for "Claude Code"
    Then they carry that gateway's address and the model "claude-my-model"
