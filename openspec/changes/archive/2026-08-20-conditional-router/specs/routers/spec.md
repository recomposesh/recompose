## ADDED Requirements

### Requirement: Conditional mode routes each request down the branch the judge names

A router in `conditional` mode MUST carry a judge binding, an ordered list of labeled branches, and a permanent else branch. The judge binding is an account plus a provider model, resolved with the same custody, cooling, and health rules as any target. For each decision the router MUST make one constrained classification call. The call hands the judge the branch labels, the branch rules, and the tail of the request, and the judge MUST answer with exactly one branch label. The router MUST hand the request to the child behind the answered label. A broken answer earns one retry, and a second broken answer MUST land the request on the else branch.

#### Scenario: the judge sends a matching request down its branch

- Given a virtual model bound to a conditional router with a `code` branch, a `chat` branch, and an else branch
- When a request arrives that the judge classifies as `code`
- Then the child behind the `code` branch receives the request
- And the answer travels back to the caller

#### Scenario: a judge answer naming no branch lands on else after one retry

- Given a virtual model bound to a conditional router whose judge answers with text matching no branch label
- When a request arrives under the virtual model's name
- Then the judge receives exactly two classification calls
- And the child behind the else branch receives the request

### Requirement: Routing trouble lands on else and never drops a request

A conditional router MUST hold a permanent else branch that no edit removes. A judge refusal, a cooling judge, an answer past the timeout budget, and an answer matching no branch MUST each land the request on the else branch. A conditional router MUST NOT answer a routing refusal for trouble the else branch can absorb, and the else child MUST receive the request instead.

#### Scenario: a cooling judge sends the request down else without a classification call

- Given a conditional router whose judge stands cooling from an earlier rate limit
- When a request arrives under the virtual model's name
- Then no classification call leaves the machine
- And the child behind the else branch receives the request

#### Scenario: a judge past its timeout budget lands the request on else

- Given a conditional router whose judge doesn't answer within the timeout budget
- When a request arrives under the virtual model's name
- Then the child behind the else branch receives the request
- And the answer travels back to the caller

### Requirement: A conversation keeps the branch it first earned

A conditional router MUST key each conversation by a fingerprint. It MUST keep handing a known conversation to the branch its first request earned, so the prompt cache survives and mid-conversation behavior stays stable. A per-router toggle MUST allow re-judging every request. A server-state turn, one that resumes state a single account holds, MUST NOT change branch even when the toggle asks for a fresh judgment, following the chained-turn precedent.

#### Scenario: the second turn of a conversation skips the judge

- Given a conditional router that classified a conversation's first request onto the `code` branch
- When a second request arrives carrying the same conversation fingerprint
- Then no classification call leaves the machine
- And the child behind the `code` branch receives the request

#### Scenario: a server-state turn refuses a branch change under re-judge

- Given a conditional router with re-judge enabled whose earlier turn earned the `chat` branch
- When a request arrives that resumes state a provider holds for one account
- Then the child behind the `chat` branch receives the request
- And no classification call leaves the machine
