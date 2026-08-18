# routers Specification

## Purpose

A virtual model binds a router in place of a single target, so several accounts can stand behind one name a client asks for. A router carries a mode and an ordered list of children, and a child is a target or another router, so routers chain. Failover offers its children in declared order and round-robin spreads across them, and a child that refuses in a way another child could cure passes the request on. Custody resolves per attempt, so what one child spends and what it refuses says nothing about any other. The first byte written downstream commits the child that wrote it: before it a request may move on, and after it the provider's own answer reaches the caller untouched. A router that can serve nobody refuses in words naming what stood in the way, rather than picking a child anyway.

## Requirements

### Requirement: A router stands between a virtual model and its targets

A virtual model MUST be able to bind a router in place of a target. A router carries one mode and an ordered list of children, and a child is a target or another router. A router holding no child MUST refuse the request rather than answer it, and the refusal MUST name the empty router.

#### Scenario: a virtual model binds a router over two targets

- Given a gateway holding two stored accounts
- When a person binds a virtual model to a router carrying both accounts as targets
- Then the stored gateway document holds the router with its two children in the declared order
- And a request under the virtual model's name reaches one of the two targets

#### Scenario: an empty router refuses instead of answering

- Given a virtual model bound to a router holding no child
- When a request arrives under the virtual model's name
- Then the gateway answers a typed refusal naming the empty router
- And no request leaves the machine

### Requirement: Failover tries the next eligible target in declared order

A router in `failover` mode MUST offer its children in declared order and MUST hand the request to the first child that can answer. A child that refuses with a retryable outcome MUST pass the request to the next child. A child that refuses with a request-scoped outcome MUST end the attempt. It MUST answer that refusal to the caller, because a second target would refuse it the same way. A router MUST attempt each child at most once for one request. When every child has refused with a retryable outcome, the router MUST answer a typed refusal naming the exhausted router and every child it tried with the reason each gave. That refusal MUST carry a retry time only when every child it tried promised one. Once the first byte of the answer has reached the caller, the router MUST NOT begin another child. It MUST forward the provider's stream error and record the failed attempt.

#### Scenario: a rate-limited target hands the request to the next one

- Given a virtual model bound to a failover router over a first and a second target
- When the first target refuses the request with a rate limit
- Then the second target receives the request
- And the answer travels back to the caller

#### Scenario: a ladder every child refuses answers the exhausted refusal

- Given a virtual model bound to a failover router over a first and a second target
- When both targets refuse the request with rate limits
- Then each target receives exactly one attempt
- And the caller receives one typed refusal naming the router and both children

#### Scenario: a malformed request stops at the first target

- Given a virtual model bound to a failover router over a first and a second target
- When the first target refuses the request as malformed
- Then the caller receives that refusal
- And the second target receives nothing

#### Scenario: a failure after the first byte never moves target

- Given a failover router whose first target has written its first byte to the caller
- When that target's stream fails partway
- Then the caller receives the provider's stream error
- And no other target receives the request

### Requirement: Round-robin spreads eligible requests across its children

A router in `round-robin` mode MUST distribute eligible requests evenly across its children, and MUST skip a child that stands cooling from an earlier refusal. If every child stands cooling, the router MUST answer a typed refusal naming the exhausted router rather than picking one anyway.

#### Scenario: two requests reach two different targets

- Given a virtual model bound to a round-robin router over two targets
- When two requests arrive under the virtual model's name
- Then each target receives one of them

#### Scenario: the router skips a cooling target

- Given a round-robin router over two targets where the first stands cooling from a rate limit
- When a request arrives under the virtual model's name
- Then the second target receives it
- And the first target receives nothing until its cooling ends

#### Scenario: every child cooling refuses instead of picking one anyway

- Given a round-robin router whose every child stands cooling from an earlier rate limit
- When a request arrives under the virtual model's name
- Then the gateway answers a typed refusal naming the exhausted router and each cooling child
- And no request leaves the machine

### Requirement: A chained turn refuses at the router that would spread it

A request MAY resume state one account alone holds: it names an earlier response, replays sealed reasoning, or carries a signed thinking block, in whatever dialect the request arrived. Such a chained turn MUST NOT rotate across accounts, because only the account that minted the seal can read it. A router in `round-robin` mode MUST refuse a chained turn with a typed refusal, whatever depth that router stands at. The refusal MUST name the router and offer the two ways out: switching the router to failover, or starting a conversation that resumes nothing. A round-robin router holding no child MUST still refuse the chained turn rather than report itself empty, because the question comes before the pick. A router in `failover` mode MUST carry a chained turn, and a turn that resumes nothing MUST rotate as any other request.

#### Scenario: a chained turn refuses at a nested round-robin

- Given a virtual model bound to a failover router whose child is a round-robin router over two targets
- When a request arrives that resumes state a provider holds for one account
- Then the gateway answers a typed refusal naming the round-robin router
- And the refusal offers failover mode or a conversation that resumes nothing
- And no request leaves the machine

#### Scenario: a failover chain carries the chained turn

- Given a virtual model bound to a failover router over two targets
- When a request arrives that resumes state a provider holds for one account
- Then the first target receives it
- And the answer travels back to the caller
