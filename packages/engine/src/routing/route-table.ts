import type { EngineRouteNode, EngineRouting, EngineTargetStanding } from '@recompose/contracts';

export type EngineRouter = Extract<EngineRouteNode, { kind: 'router' }>;

export type DeclaredTarget = { routeNode: string; standing: EngineTargetStanding };

export type ChildlessRouter = { routeNode: string; router: EngineRouter };

type NamedRouteNode = { routeNode: string; node: EngineRouteNode };

function nodeNotYetPassed(
  routing: EngineRouting,
  routeNode: string,
  passed: Set<string>,
): EngineRouteNode | undefined {
  if (passed.has(routeNode)) return undefined;

  passed.add(routeNode);

  return routing.nodes[routeNode];
}

function* nodesInDeclaredOrder(routing: EngineRouting): Generator<NamedRouteNode> {
  const passed = new Set<string>();
  const pending = [routing.entry];

  for (;;) {
    const routeNode = pending.pop();

    if (routeNode === undefined) return;

    const node = nodeNotYetPassed(routing, routeNode, passed);

    if (node !== undefined) {
      yield { routeNode, node };

      if (node.kind === 'router') pending.push(...node.children.toReversed());
    }
  }
}

/**
 * Every target a table can reach from its entry, in the order the routers declare them.
 *
 * @summary A child naming no node is passed over rather than counted, and a table that leads back to
 * a node already passed stops rather than circling, so this reader is total for any table the lane
 * delivers. The order is the reading order every refusal and every note follows, which is what makes
 * a walk's account of itself the same however its policies picked.
 */
export function targetsInDeclaredOrder(routing: EngineRouting): readonly DeclaredTarget[] {
  const reached: DeclaredTarget[] = [];

  for (const { routeNode, node } of nodesInDeclaredOrder(routing)) {
    if (node.kind === 'target') reached.push({ routeNode, standing: node.standing });
  }

  return reached;
}

/**
 * The first target a table declares, which every path that can serve only one target resolves.
 *
 * @summary Counting tokens, drawing an image, and preparing a socket each need one account and one
 * provider model, and none of them can walk a ladder. They all ask here, so the single rule that
 * turns a table into one target is this function rather than each caller's own descent. A removed
 * target still answers, because the caller refusing a removed binding is the same refusal it wrote
 * before any router existed.
 */
export function firstDeclaredTarget(routing: EngineRouting): DeclaredTarget | undefined {
  return targetsInDeclaredOrder(routing)[0];
}

/**
 * The first router a table holds that stands over no child at all.
 *
 * @summary A person wires a router before wiring its children, so an incomplete router is a normal
 * saved state rather than a corruption. The walk asks here only once it finds no target to attempt,
 * so the refusal can name the router that stood in the way instead of reporting an empty ladder as
 * an exhausted one.
 */
export function childlessRouterTheTableHolds(routing: EngineRouting): ChildlessRouter | undefined {
  for (const { routeNode, node } of nodesInDeclaredOrder(routing)) {
    if (node.kind === 'router' && node.children.length === 0) return { routeNode, router: node };
  }

  return undefined;
}
