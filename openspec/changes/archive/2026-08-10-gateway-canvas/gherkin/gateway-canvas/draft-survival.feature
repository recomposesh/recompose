Feature: A draft virtual model survives until completed or deleted

  A draft born on the canvas keeps its place and its partial definition in a
  distinct draft treatment, through deselection and screen changes, until the
  person completes it in the inspector or deletes it.

  Scenario: Deselection leaves the draft standing
    Given a draft virtual model node born from the gateway's plus
    When the person deselects it
    Then the draft stays on the canvas in its draft treatment

  Scenario: The draft survives leaving the screen
    Given a draft virtual model holding the partial name "fa"
    When the person leaves the gateway detail and returns
    Then the draft stands where it was, still holding "fa"

  Scenario: Completing the definition graduates the draft
    Given a draft virtual model node wired to the gateway
    When the person completes the definition, naming "fast" over the provider model "claude-sonnet-5"
    Then "fast" stands as a virtual model node in the regular treatment
