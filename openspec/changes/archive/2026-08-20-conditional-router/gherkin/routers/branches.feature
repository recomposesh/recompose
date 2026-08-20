Feature: Branches are named and ruled where the wires run

  A branch pairs a short label with a free-text rule, and both write the
  judge's vocabulary. A fresh branch routes nothing until it holds them, a
  rename or a rule edit changes what the judge reads, and a deleted branch
  hands its matched traffic to else.

  Background:
    Given a virtual model "fast" bound to a conditional router with a "code" branch, a "chat" branch, and an else branch

  Scenario: A draft branch routes nothing until it holds a label and a rule
    Given a fresh branch wired to a target, holding neither label nor rule
    When a request arrives under "fast"
    Then the classification call offers "code" and "chat" alone
    And the fresh branch's child receives nothing

  Scenario: An empty label derives from the rule text
    Given a branch ruled "questions about billing" holding no label of its own
    Then the branch's cable pill prints a label drawn from the rule

  Scenario: Deleting a branch names its cost first
    Given the inspector open on the router
    When the person asks to delete the "code" branch from its row
    Then a confirmation says requests that matched the rule will fall to else

  Scenario: A deleted branch's traffic falls to else
    Given a conversation that earned the "code" branch
    When the person deletes the "code" branch
    And the conversation's next turn arrives
    Then the child behind the else branch receives it

  Scenario: Renaming a branch rewrites the judge's vocabulary
    When the person renames the "code" branch to "programming"
    And a fresh conversation arrives under "fast"
    Then the classification call offers "programming" and never "code"

  Scenario: Editing a rule changes what the judge reads
    Given the "code" branch ruled "questions about source code"
    When the person rewrites the rule to "questions about source code or build failures"
    And a fresh conversation arrives under "fast"
    Then the classification call carries the rewritten rule
