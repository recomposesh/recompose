Feature: What a gateway requiring an API key answers

  Background:
    Given a running gateway named "codex" requiring an API key

  Scenario: A request carrying no key never reaches a model
    When a client sends a model request to "codex" carrying no key
    Then "codex" refuses with an authentication error naming itself
    And the refusal challenges the client to present a bearer credential

  Scenario: A request carrying the wrong key is refused the same way
    When a client sends a model request to "codex" carrying "rc-local-anotherPersonsKey"
    And a client sends a model request to "codex" carrying no key
    Then the two answers read alike

  Scenario Outline: Each client presents the key in its own dialect's field
    When a client sends a model request to "codex" presenting the key in <field>
    Then "codex" serves the request

    Examples:
      | field                     |
      | the Authorization header  |
      | the x-api-key header      |
      | the x-goog-api-key header |
      | the key query parameter   |

  Scenario: A placeholder in one field never masks the key in another
    When a client sends a model request to "codex" carrying a placeholder beside the key
    Then "codex" serves the request

  Scenario: The health path answers without the key
    When a client checks the health of "codex" carrying no key
    Then "codex" answers with its own name

  Scenario: The management paths stay closed
    When a client asks "codex" for its request logs carrying no key
    Then "codex" refuses with an authentication error naming itself

  Scenario: A gateway holding a key it no longer requires answers as it always did
    Given "codex" no longer requires its API key
    When a client sends a model request to "codex" carrying no key
    Then "codex" answers without asking for a key

  Scenario: A gateway that never minted a key answers as it always did
    Given a running gateway named "gemini" holding no API key
    When a client sends a model request to "gemini" carrying no key
    Then "gemini" answers without asking for a key
