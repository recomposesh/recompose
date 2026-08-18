# gateway-canvas Specification

## Purpose

The gateway detail screen renders a gateway's composition as a live canvas. The gateway, its virtual models, and their stored targets stand as cards, and every binding stands as a cable between them. A person composes by pulling cables or by answering keyboard asks. Each cable paints the traffic it carried, and the cable that carried a failure offers the reason. Every gesture that changes topology writes through the stored gateway document alone.

## Requirements

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

### Requirement: A cable dragged between nodes creates a binding

A person MUST be able to drag a cable out of a node's port and drop it on a compatible node to create the binding. A stored binding always carries a provider model, so the drop MUST open the provider-model pick and the completed pick MUST write the binding. The provider model is the real model name the picked account serves, per the virtual-models specification. A completed pick MUST persist exactly one stored account and one provider model on the virtual model. The gesture reads the way Excalidraw pulls an arrow. A drop on empty canvas MUST open the grouped picker of stored accounts. Picking an account and its provider model MUST materialize a wired target node at the drop point. Esc MUST cancel a drag in flight and leave the composition unchanged.

#### Scenario: a person wires a virtual model by cable

- Given a gateway node and an unbound virtual model node on the canvas
- When a person drags a cable from the virtual model's port onto a stored target node and picks the provider model
- Then the virtual model stands bound to that target
- And the canvas renders the new cable

#### Scenario: a drop on empty canvas becomes an add

- Given a virtual model node with no target bound
- When a person drags a cable from its port and drops it on empty canvas
- Then the picker of stored accounts opens
- And picking an account and its provider model materializes a wired target node at the drop point

#### Scenario: Esc cancels the drag

- Given a cable drag in flight
- When the person presses Esc
- Then the drag cancels
- And the composition stands unchanged

### Requirement: Every source port answers a keyboard without a drag

Every source port MUST carry a keyboard-reachable ask that paints only under keyboard focus, with a visible focus indicator. The ask stays keyboard reachable while its pointer affordance stands hidden. The canvas shows no standing icon beside a node, and a pointer meets only the cable. The gateway port's ask MUST drop a connected draft virtual model and open the inspector on it. A virtual model port's ask MUST open the picker of stored accounts. A gateway with nothing wired stands as a plain node, because pulling a cable out of its port is the one composing gesture.

#### Scenario: an empty gateway stands plain

- Given a gateway with no virtual models defined
- When a person opens the gateway detail
- Then the canvas shows the gateway as a plain node with no standing affordance beside its port

#### Scenario: a keyboard reaches the ask a pointer never sees

- Given a gateway holding a virtual model bound to a stored target
- When a person moves keyboard focus onto the gateway port's ask
- Then the ask paints and names what it offers
- And pressing Enter births a connected draft virtual model and opens the inspector on it

#### Scenario: a virtual model's ask opens the account picker

- Given a virtual model holding no target
- When a person moves keyboard focus onto the virtual model port's ask and presses Enter
- Then the grouped picker of stored accounts opens

### Requirement: A cable paints the traffic it carried

A cable with no recorded traffic MUST stand still in the resting tone. A cable whose request is still in flight MUST paint live with a traveling pulse on an unbroken line, and the pulse belongs to that live standing alone. A cable whose last request served MUST paint steady green on an unbroken line, with no motion. A cable whose last request failed MUST paint steady red and MUST stand a pressable last-error trigger on the path. Pressing the trigger MUST reveal the status and the failure's reason. A newer outcome MUST replace the older one. The pulse yields where the person asked for reduced motion, and the colors stand either way.

#### Scenario: a request in flight pulses the cable

- Given a virtual model bound to a stored target
- When a request through that virtual model is still in flight
- Then its wire and its cable paint live with a traveling pulse

#### Scenario: a served request turns the cables green

- Given a virtual model bound to a stored target
- When a request through that virtual model comes back served
- Then its wire and its cable paint steady green on an unbroken line

#### Scenario: a failed request offers its reason on the cable

- Given a virtual model whose last request failed
- When a person presses the last-error trigger on its cable
- Then the status and the failure's reason stand readable
- And a later served request returns the cables to green and takes the trigger away
