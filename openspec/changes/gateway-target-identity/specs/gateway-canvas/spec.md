# gateway-canvas Specification

## MODIFIED Requirements

### Requirement: The gateway detail renders its composition as a canvas

The gateway detail screen MUST render the gateway's composition as nodes on a canvas. The gateway stands as a node, with its virtual models and their targets as nodes wired to it by cables. A wire MUST run from the gateway node to each of its virtual model nodes. A cable MUST run from each bound virtual model node to its target node, and a bound virtual model carries exactly one target cable. A target card MUST stand for the pair of a stored account and the real model it serves. Two virtual models that bind different real models of one account MUST stand as two target cards. A target card MUST name the real model it serves beside its account name. Every composing gesture MUST write through the stored gateway document and nothing else.

#### Scenario: an existing composition appears wired

- Given a gateway holding a virtual model bound to a stored target
- When a person opens the gateway detail
- Then the canvas shows the gateway, the virtual model, and the target as nodes
- And a cable connects each node to its binding

#### Scenario: two real models of one account stand as two cards

- Given a gateway holding two virtual models bound to two different real models of the same stored account
- When a person opens the gateway detail
- Then the canvas shows two target cards, one per real model
- And each cable meets the card that serves its virtual model's real model
