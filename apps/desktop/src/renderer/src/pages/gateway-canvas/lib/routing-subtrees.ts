import type { RouteNode, Routing } from '@recompose/contracts';

import { conditionalIn, nodeWithout } from './conditional-policy';

/**
 * Every id one node reaches, which is its children and, where it judges, the judge it asks.
 *
 * @summary The stored shape counts the judge as reached from the router naming it, so an edit
 * walking children alone would leave a judge standing where no entry reaches it and the whole write
 * would bounce off the schema. One rule about what a node names keeps the edits and the parse
 * agreeing on which nodes a subtree holds.
 */
function referencedBy(node: RouteNode): readonly string[] {
  if (node.kind !== 'router') {
    return [];
  }

  const advisor = conditionalIn(node)?.judge;

  return advisor === undefined ? node.children : [...node.children, advisor];
}

/** Every node one id holds, itself included, following what each node along the way names. */
export function standingUnder(routing: Routing, nodeId: string): ReadonlySet<string> {
  const reached = new Set<string>();
  const walk = [nodeId];
  let held = walk.pop();

  while (held !== undefined) {
    const node = routing.nodes[held];

    if (node !== undefined && !reached.has(held)) {
      reached.add(held);
      walk.push(...referencedBy(node));
    }

    held = walk.pop();
  }

  return reached;
}

/** Every node one id holds apart from itself, which is what a node keeping its seat gives up. */
export function beneath(routing: Routing, nodeId: string): ReadonlySet<string> {
  const reached = new Set(standingUnder(routing, nodeId));

  reached.delete(nodeId);

  return reached;
}

/** The table once these ids have left it, with every node that named one no longer naming it. */
export function tableWithout(routing: Routing, gone: ReadonlySet<string>): Routing {
  const kept: Record<string, RouteNode> = {};

  for (const [id, node] of Object.entries(routing.nodes)) {
    if (!gone.has(id)) {
      kept[id] = nodeWithout(node, gone);
    }
  }

  return { entry: routing.entry, nodes: kept };
}
