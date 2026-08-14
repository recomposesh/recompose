import type { GatewayConfig, RouteNode, RouterPolicy, Routing } from '@recompose/contracts';

import { mintRouteNodeId } from '@recompose/contracts';

/** Which of the two shipped ways a router spreads the requests reaching it. */
export type RouterMode = RouterPolicy['mode'];

/**
 * A route table reaching one fresh router, which holds no child until a person binds one.
 *
 * @summary Decision 18's ask drops a wired router with no dialog, so a router is born empty and
 * refuses only when a request arrives, rather than a person having to fill it before it will save.
 * The id comes from the one contracts rule every route node id comes from, so nothing here can
 * drift from what the stored migration mints.
 */
export function routedThroughARouter(mode: RouterMode): Routing {
  const entry = mintRouteNodeId();

  return { entry, nodes: { [entry]: { kind: 'router', policy: { mode }, children: [] } } };
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
  mode: RouterMode,
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
 * traffic nobody asked to reroute. A route node that routes nothing takes no child, so a stray ask
 * leaves the document as it stood rather than writing a table the stored shape would refuse.
 */
export function gatewayBindingChild(
  gateway: GatewayConfig,
  modelId: string,
  routerId: string,
  child: RouteNode,
): GatewayConfig {
  const childId = mintRouteNodeId();

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
 * The gateway once one router spreads the requests reaching it a different way.
 *
 * @summary The mode is the whole of what a router decides, so switching it leaves the children and
 * their order exactly as they stood: a person trying the other mode is not rebuilding the ladder.
 */
export function gatewaySwitching(
  gateway: GatewayConfig,
  modelId: string,
  routerId: string,
  mode: RouterMode,
): GatewayConfig {
  return routedBy(gateway, modelId, (was) =>
    routerEdited(was, routerId, (router) => ({ ...router, policy: { mode } })),
  );
}
