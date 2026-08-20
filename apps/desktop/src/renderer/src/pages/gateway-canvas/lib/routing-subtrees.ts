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

function everythingReachedFrom(routing: Routing, nodeId: string): Set<string> {
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

function judgesTheRestOfTheTableAsks(
  routing: Routing,
  leaving: ReadonlySet<string>,
): ReadonlySet<string> {
  const asked = new Set<string>();

  for (const [id, node] of Object.entries(routing.nodes)) {
    const advisor = leaving.has(id) ? undefined : conditionalIn(node)?.judge;

    if (advisor !== undefined) {
      asked.add(advisor);
    }
  }

  return asked;
}

/**
 * Whether any conditional router in this table still asks the judge standing under this id.
 *
 * @summary An edit that takes a judge out reads this first, whichever way it moves the router that
 * asked for one: a judge is held by every router naming it, so the last of them to let go is the
 * one that carries it out. Any earlier removal would strand a survivor's policy on a node the
 * table no longer holds and bounce the whole write.
 */
export function judgeStillAsked(routing: Routing, judgeId: string): boolean {
  return judgesTheRestOfTheTableAsks(routing, new Set()).has(judgeId);
}

/**
 * Every node one id takes with it, itself included, following what each node along the way names.
 *
 * @summary Two conditional routers may lawfully ask the same judge, so a judge is held by the
 * router naming it rather than owned by it: carrying one out with the first router to leave would
 * strand the survivor's policy on a node the table no longer holds and bounce the whole write. A
 * judge is always a target, so a judge some surviving router still asks stays behind whether it is
 * the node being dropped or one reached along the way, and either reading leaves the table whole.
 */
export function standingUnder(routing: Routing, nodeId: string): ReadonlySet<string> {
  const reached = everythingReachedFrom(routing, nodeId);
  const outliving = judgesTheRestOfTheTableAsks(routing, reached);

  return new Set([...reached].filter((held) => !outliving.has(held)));
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
