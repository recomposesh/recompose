import type { RouteNode, RouteTarget, Routing } from '@recompose/contracts';

/** One node of a virtual model's route table, read with where it stands in the routing. */
export type WalkedRouteNode = {
  /** The id the stored table holds this node under. */
  routeNodeId: string;
  /** The node itself, which is a target or a router. */
  node: RouteNode;
  /** How many routers stand between the virtual model and this node. */
  depth: number;
  /** The route node that names this one as a child, or nothing at the entry. */
  parent: string | undefined;
};

function walkSubtree(routing: Routing, walked: WalkedRouteNode, into: WalkedRouteNode[]): void {
  into.push(walked);

  if (walked.node.kind !== 'router') {
    return;
  }

  for (const childId of walked.node.children) {
    const child = routing.nodes[childId];

    if (child !== undefined) {
      walkSubtree(
        routing,
        { routeNodeId: childId, node: child, depth: walked.depth + 1, parent: walked.routeNodeId },
        into,
      );
    }
  }
}

/**
 * Every node a route table holds, in the order a person declared them, each with its depth.
 *
 * @summary This is the one walk of a stored route table the canvas owns, so the cards, the cables,
 * the seating, and the drawer all read one traversal rather than four that drift. The order is the
 * order a ladder declares, entry first and each child before its own children, which is what makes
 * a router's children land on adjacent rows and its cables fan without crossing. The depth is what
 * the column derives from, so a node one router down stands one pitch further out. A child naming
 * no node in the table adds nothing, because the stored shape refuses that table at parse and a
 * card standing for nothing would say a binding exists where none does.
 */
export function walkedRouteNodes(routing: Routing): readonly WalkedRouteNode[] {
  const entry = routing.nodes[routing.entry];

  if (entry === undefined) {
    return [];
  }

  const walked: WalkedRouteNode[] = [];

  walkSubtree(
    routing,
    { routeNodeId: routing.entry, node: entry, depth: 0, parent: undefined },
    walked,
  );

  return walked;
}

/**
 * The target a route table reaches first, which is the one every reading of a single model uses.
 *
 * @summary A reader needing one account and one real model asks the ladder what it tries first,
 * because that is the target a request meets before any failure moves it along. A table holding no
 * target at all answers nothing, so a router a person has not filled yet reads as incomplete rather
 * than as bound to something.
 */
export function firstDeclaredTarget(routing: Routing): RouteTarget | undefined {
  for (const walked of walkedRouteNodes(routing)) {
    if (walked.node.kind === 'target') {
      return walked.node;
    }
  }

  return undefined;
}
