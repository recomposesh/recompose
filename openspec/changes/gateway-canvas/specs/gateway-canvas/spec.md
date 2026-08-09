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

### Requirement: The plus affordance persists on every source port

Every source port MUST carry a persistent plus affordance, whether the node stands wired or bare. The gateway node's plus MUST drop a connected draft virtual model and open the inspector. A virtual model's plus MUST open the picker of stored accounts. A gateway with nothing wired MUST still draw its automatic wire ending in a plus, instead of presenting a bare canvas.

#### Scenario: an empty gateway offers the plus affordance

- Given a gateway with no virtual models defined
- When a person opens the gateway detail
- Then the gateway node shows a wire ending in a plus affordance

#### Scenario: a wired gateway keeps its plus

- Given a gateway holding a virtual model bound to a stored target
- When a person opens the gateway detail
- Then the gateway node's port offers a plus affordance
- And the virtual model's port offers a plus affordance
