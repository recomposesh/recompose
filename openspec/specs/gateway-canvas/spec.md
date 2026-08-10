# gateway-canvas Specification

## Purpose

The gateway detail screen renders a gateway's composition as a live canvas. The gateway, its virtual models, and their stored targets stand as cards, and every binding stands as a cable between them. A person composes by pulling cables or by answering keyboard asks. Each cable paints the traffic it carried, and the cable that carried a failure offers the reason. Every gesture that changes topology writes through the stored gateway document alone.

## Requirements

### Requirement: The gateway detail renders its composition as a canvas

The gateway detail screen MUST render the gateway's composition as nodes on a canvas. The gateway stands as a node, with its virtual models and their targets as nodes wired to it by cables. Every existing binding MUST appear as a cable, so the topology a person composed reads at a glance without opening a list.

#### Scenario: an existing composition appears wired

- Given a gateway holding a virtual model bound to a stored target
- When a person opens the gateway detail
- Then the canvas shows the gateway, the virtual model, and the target as nodes
- And a cable connects each node to its binding

### Requirement: A cable dragged between nodes creates a binding

A person MUST be able to drag a cable out of a node's port and drop it on a compatible node to create the binding. A stored binding always carries a provider model, so the drop MUST open the provider-model pick and the completed pick MUST write the binding. The gesture reads the way Excalidraw pulls an arrow. A drop on empty canvas MUST open the grouped picker of stored accounts. Picking an account and its provider model MUST materialize a wired target node at the drop point. Esc MUST cancel a drag in flight and leave the composition unchanged.

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

Every source port MUST carry a keyboard-reachable ask that paints only under keyboard focus. The canvas shows no standing icon beside a node, and a pointer meets only the cable. The gateway port's ask MUST drop a connected draft virtual model and open the inspector. A virtual model port's ask MUST open the picker of stored accounts. A gateway with nothing wired stands as a plain node, because pulling a cable out of its port is the one composing gesture.

#### Scenario: an empty gateway stands plain

- Given a gateway with no virtual models defined
- When a person opens the gateway detail
- Then the canvas shows the gateway as a plain node with no standing affordance beside its port

#### Scenario: a keyboard reaches the ask a pointer never sees

- Given a gateway holding a virtual model bound to a stored target
- When a person moves keyboard focus onto the gateway port's ask
- Then the ask paints and names what it offers
- And pressing Enter takes it up
