import type {
  GatewayConfig,
  RouteNode,
  RouterPolicy,
  RouteTarget,
  Routing,
} from '@recompose/contracts';

import { mintRouteNodeId } from '@recompose/contracts';

/** Which of the shipped ways a router spreads the requests reaching it. */
export type RouterMode = RouterPolicy['mode'];

/** A mode whose whole policy is the mode, which is every mode a canvas edit builds a router with. */
export type SpreadingMode = Exclude<RouterMode, 'conditional'>;

/**
 * A route table reaching one fresh router, which holds no child until a person binds one.
 *
 * @summary Decision 18's ask drops a wired router with no dialog, so a router is born empty and
 * refuses only when a request arrives, rather than a person having to fill it before it will save.
 * The id is minted rather than spelled here, but the mint is not the only writer of one: the
 * version 4 migration derives its own without coming through it, so a table can hold both shapes
 * at once and no reader may assume the one this writes.
 *
 * The name is absent wherever nobody wrote one, never empty, because a router falls back to its
 * mode only while it holds no name at all.
 */
export function routedThroughARouter(mode: SpreadingMode, displayName?: string): Routing {
  const entry = mintRouteNodeId();
  const router: RouteNode = { kind: 'router', policy: { mode }, children: [] };

  return {
    entry,
    nodes: { [entry]: displayName === undefined ? router : { ...router, displayName } },
  };
}

function routedBy(gateway: GatewayConfig, modelId: string, edit: (was: Routing) => Routing) {
  return {
    ...gateway,
    virtualModels: gateway.virtualModels.map((model) =>
      model.id === modelId ? { ...model, routing: edit(model.routing) } : model,
    ),
  };
}

function routerEdited(
  routing: Routing,
  routerId: string,
  edit: (was: Extract<RouteNode, { kind: 'router' }>) => RouteNode,
): Routing {
  const held = routing.nodes[routerId];

  if (held?.kind !== 'router') {
    return routing;
  }

  return { entry: routing.entry, nodes: { ...routing.nodes, [routerId]: edit(held) } };
}

/**
 * The gateway once one virtual model reaches a fresh router instead of what it bound.
 *
 * @summary A model binds one thing, so the router takes the binding's place and what stood there
 * becomes the router's first child, which is what a person dropping a router onto a bound model
 * means by it. The displaced card keeps its route node id and moves one column right, because a
 * route node's column counts out from its depth rather than from its kind.
 */
export function gatewayRoutingThrough(
  gateway: GatewayConfig,
  modelId: string,
  mode: SpreadingMode,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) => {
    const entry = mintRouteNodeId();

    return {
      entry,
      nodes: {
        ...was.nodes,
        [entry]: { kind: 'router', policy: { mode }, children: [was.entry] },
      },
    };
  });
}

/**
 * The gateway once one router holds another child, standing last in the ladder.
 *
 * @summary A child joins the end rather than the front, because failover walks its children in
 * declared order and a new binding jumping ahead of the one already answering would reroute live
 * traffic nobody asked to reroute. The caller names the child rather than the write minting it,
 * because the canvas seats the card this write brings into being and a card cannot be seated
 * under a name nobody knows yet. A route node that routes nothing takes no child, so a stray ask
 * leaves the document as it stood rather than writing a table the stored shape would refuse.
 */
export function gatewayBindingChild(
  gateway: GatewayConfig,
  modelId: string,
  routerId: string,
  childId: string,
  child: RouteNode,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) => {
    const grown = routerEdited(was, routerId, (router) => ({
      ...router,
      children: [...router.children, childId],
    }));

    return grown === was
      ? was
      : { entry: grown.entry, nodes: { ...grown.nodes, [childId]: child } };
  });
}

function standingUnder(routing: Routing, nodeId: string): ReadonlySet<string> {
  const reached = new Set<string>();
  const walk = [nodeId];
  let held = walk.pop();

  while (held !== undefined) {
    const node = routing.nodes[held];

    if (node !== undefined && !reached.has(held)) {
      reached.add(held);

      if (node.kind === 'router') {
        walk.push(...node.children);
      }
    }

    held = walk.pop();
  }

  return reached;
}

/**
 * The gateway once one route node and everything standing under it leaves the table.
 *
 * @summary A router is a branch rather than a leaf, so removing one removes the ladder it holds:
 * leaving its children behind would strand nodes no entry can reach, which is exactly what the
 * stored walk refuses at parse. The entry is never dropped here, because a routing binds something
 * by construction, so releasing the whole definition is what a person deleting the entry asked for.
 * A node the table never held drops nothing, which falls out of the walk rather than needing a
 * guard of its own.
 */
function tableWithout(routing: Routing, gone: ReadonlySet<string>): Routing {
  const kept: Record<string, RouteNode> = {};

  for (const [id, node] of Object.entries(routing.nodes)) {
    if (gone.has(id)) {
      continue;
    }

    kept[id] =
      node.kind === 'router'
        ? { ...node, children: node.children.filter((child) => !gone.has(child)) }
        : node;
  }

  return { entry: routing.entry, nodes: kept };
}

export function gatewayDroppingNode(
  gateway: GatewayConfig,
  modelId: string,
  nodeId: string,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) =>
    nodeId === was.entry ? was : tableWithout(was, standingUnder(was, nodeId)),
  );
}

function beneath(routing: Routing, nodeId: string): ReadonlySet<string> {
  const reached = new Set(standingUnder(routing, nodeId));

  reached.delete(nodeId);

  return reached;
}

/**
 * The gateway once one route node stands for a different target, in the very place it held.
 *
 * @summary Dragging one end of a cable somewhere else moves a binding rather than adding one, so
 * the picked target takes the replaced node's own id and keeps the rank its siblings order it by:
 * a write that appended instead would leave the ladder a request walks longer than the person
 * meant. A router replaced this way takes the ladder it held with it, the same way rebinding a
 * routed definition's entry does, because a node whose parent stopped naming it would stand where
 * no request could reach it. A node the table never held is rebound by nobody.
 */
export function gatewayRebindingNode(
  gateway: GatewayConfig,
  modelId: string,
  nodeId: string,
  target: RouteTarget,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) => {
    if (was.nodes[nodeId] === undefined) {
      return was;
    }

    const thinned = tableWithout(was, beneath(was, nodeId));

    return { entry: thinned.entry, nodes: { ...thinned.nodes, [nodeId]: target } };
  });
}

function moved(children: readonly string[], from: number, to: number): string[] {
  const held = children[from];

  if (held === undefined || to < 0 || to >= children.length) {
    return [...children];
  }

  const without = children.filter((_, rank) => rank !== from);

  return [...without.slice(0, to), held, ...without.slice(to)];
}

/**
 * The gateway once one child stands at a new rank in the ladder holding it.
 *
 * @summary Failover reads its children top to bottom, so the rank a person drags a row to is the
 * order requests will try, and every other child keeps the order it stood in. A rank the ladder
 * does not hold moves nothing, because a reorder that silently lands somewhere else is worse than
 * one that does not happen.
 */
export function gatewayReordering(
  gateway: GatewayConfig,
  modelId: string,
  routerId: string,
  from: number,
  to: number,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) =>
    routerEdited(was, routerId, (router) => ({
      ...router,
      children: moved(router.children, from, to),
    })),
  );
}

/**
 * The gateway once one router answers to a name a person gave it, or back to its mode.
 *
 * @summary A composition standing two routers that spread the same way reads as two cards saying
 * one word, and a refusal naming the ladder that stood in the way names both, so a person owes
 * themselves the chance to tell them apart. Nothing is the name of a router nobody named, which is
 * what clearing the field writes: the mode speaks again rather than a blank card standing there.
 * The children and the mode are untouched, because naming a thing is not rebuilding it.
 */
export function gatewayNamingRouter(
  gateway: GatewayConfig,
  modelId: string,
  routerId: string,
  displayName: string | undefined,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) =>
    routerEdited(was, routerId, (router) => ({ ...router, displayName })),
  );
}

/**
 * The gateway once one router spreads the requests reaching it a different way.
 *
 * @summary The mode is the whole of what a router decides, so switching it leaves the children and
 * their order exactly as they stood: a person trying the other mode is not rebuilding the ladder.
 */
export function gatewaySwitching(
  gateway: GatewayConfig,
  modelId: string,
  routerId: string,
  mode: SpreadingMode,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) =>
    routerEdited(was, routerId, (router) => ({ ...router, policy: { mode } })),
  );
}
