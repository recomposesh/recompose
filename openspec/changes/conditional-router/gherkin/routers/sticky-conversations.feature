Feature: A conversation keeps the branch it first earned

  The first judgment pins a conversation to its branch, keyed by a
  fingerprint that prefers the caller's own conversation key and falls back
  to content that stays stable across turns. Re-judging is a choice made per
  router, and a server-state turn never changes branch.

  Background:
    Given a virtual model "fast" bound to a conditional router with a "code" branch, a "chat" branch, and an else branch

  Scenario: The second turn of a conversation skips the judge
    Given a conversation whose first request earned the "code" branch
    When a second request arrives carrying the same conversation fingerprint
    Then no classification call leaves the machine
    And the child behind the "code" branch receives the request

  Scenario: The caller's own key pins the conversation over its content
    Given a conversation carrying a caller-supplied key whose first request earned the "code" branch
    When its second request arrives under the same key with a reworded opening message
    Then no classification call leaves the machine
    And the child behind the "code" branch receives the request

  Scenario: A per-turn timestamp never breaks the pin
    Given a conversation pinned to the "chat" branch whose system prompt stamps the current time into every turn
    When its next turn arrives wearing a fresh timestamp
    Then no classification call leaves the machine
    And the child behind the "chat" branch receives the request

  Scenario: Different keys never share a pin, even over matching openings
    Given two conversations carrying different caller-supplied keys and identical opening messages
    When each conversation's first request arrives under "fast"
    Then the judge receives one classification call for each conversation

  Scenario: Re-judge every request lets a conversation change branch
    Given re-judge every request enabled on the router
    And a conversation whose first request earned the "code" branch
    When a second request arrives that the judge classifies as "chat"
    Then the child behind the "chat" branch receives the request

  Scenario: A server-state turn refuses a branch change under re-judge
    Given re-judge every request enabled on the router
    And a conversation whose earlier turn earned the "chat" branch
    When a request arrives that resumes state a provider holds for one account
    Then the child behind the "chat" branch receives the request
    And no classification call leaves the machine

  Scenario: A pin expires with the idle conversation
    Given a conversation whose first request earned the "code" branch
    And the conversation then rested idle past the pin's expiry
    When its next turn arrives
    Then the judge receives a fresh classification call
