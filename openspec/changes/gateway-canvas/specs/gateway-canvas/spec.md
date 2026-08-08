# gateway-canvas Specification

## ADDED Requirements

### Requirement: The gateway detail renders its composition as a canvas

The gateway detail screen MUST render the gateway's composition as nodes on a canvas. The gateway stands as a node, with its virtual models and their targets as nodes wired to it by cables. Every existing binding MUST appear as a cable, so the topology a person composed reads at a glance without opening a list.

#### Scenario: an existing composition appears wired

- Given a gateway holding a virtual model bound to a stored target
- When a person opens the gateway detail
- Then the canvas shows the gateway, the virtual model, and the target as nodes
- And a cable connects each node to its binding

### Requirement: A cable dragged between nodes creates a binding

A person MUST be able to drag a cable out of a node's port and drop it on a compatible node to create the binding. The gesture reads the way Excalidraw pulls an arrow. A drop outside a compatible node MUST leave the composition unchanged.

#### Scenario: a person wires a virtual model by cable

- Given a gateway node and an unbound virtual model node on the canvas
- When a person drags a cable from the virtual model's port onto a stored target node
- Then the virtual model stands bound to that target
- And the canvas renders the new cable

### Requirement: A gateway node never starts bare

A gateway node with nothing wired MUST draw an automatic wire ending in a plus affordance that serves as the add-here entry point, instead of presenting a bare canvas.

#### Scenario: an empty gateway offers the plus affordance

- Given a gateway with no virtual models defined
- When a person opens the gateway detail
- Then the gateway node shows a wire ending in a plus affordance
