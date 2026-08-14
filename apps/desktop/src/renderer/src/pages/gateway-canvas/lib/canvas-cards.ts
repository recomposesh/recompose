import type {
  Account,
  RouterPolicy,
  RouteTarget,
  SubscriptionAccountView,
} from '@recompose/contracts';

import type { SeatedRouteNode } from './route-graph';

import { accountDetail } from '../../../entities/account';

/** A card standing on the canvas, which is either engine truth or one of the two overlay cards. */
export type CanvasNode =
  | { id: string; kind: 'gateway'; displayName: string; port: number }
  | {
      id: string;
      kind: 'virtual-model';
      modelId: string;
      displayName: string;
      providerModel: string;
    }
  | {
      id: string;
      kind: 'target';
      account: Account;
      modelId: string;
      routeNodeId: string;
      depth: number;
      detail?: string;
    }
  | {
      id: string;
      kind: 'ghost-target';
      accountId: string;
      modelId: string;
      routeNodeId: string;
      depth: number;
    }
  | {
      id: string;
      kind: 'router';
      modelId: string;
      routeNodeId: string;
      depth: number;
      mode: RouterPolicy['mode'];
      displayName: string | undefined;
      childCount: number;
    }
  | { id: string; kind: 'draft-model'; modelId: string; displayName: string }
  | { id: string; kind: 'pending-target' };

/** Which card a node stands as, which is what decides the column it seats in. */
export type CanvasNodeKind = CanvasNode['kind'];

/** One route node placed on the canvas, holding the name its card and its cable both read. */
export type PlacedRouteNode = { modelId: string; name: string; seat: SeatedRouteNode };

/** The registry a target card reads itself against, as the drawer holds it. */
export type Registry = {
  accounts: readonly Account[];
  subscriptions: readonly SubscriptionAccountView[];
};

type RouterNode = Extract<SeatedRouteNode['node'], { kind: 'router' }>;

/**
 * What names one route node's card apart from every other on the canvas.
 *
 * @summary A virtual model reaches exactly one entry, so the entry answers in the model's own name
 * and every card a gateway stood before routers existed keeps the id it stood under. A node below
 * the entry adds the id its ladder holds it by, which is what lets one model stand several targets
 * without two cards colliding. A cable reads the same rule for the router it leaves, so a parent
 * and its child never disagree about the card standing between them.
 */
export function seatName(modelId: string, routeNodeId: string, entry: string): string {
  return routeNodeId === entry ? modelId : `${modelId}:${routeNodeId}`;
}

function ghostCard(placed: PlacedRouteNode, bound: RouteTarget): CanvasNode {
  return {
    id: `ghost:${placed.name}`,
    kind: 'ghost-target',
    accountId: bound.accountId,
    modelId: placed.modelId,
    routeNodeId: placed.seat.routeNodeId,
    depth: placed.seat.depth,
  };
}

function targetCard(placed: PlacedRouteNode, bound: RouteTarget, registry: Registry): CanvasNode {
  const account = registry.accounts.find((held) => held.id === bound.accountId);

  if (account === undefined) {
    return ghostCard(placed, bound);
  }

  const signedInAs = registry.subscriptions.find((view) => view.id === account.id)?.signedInAs;

  return {
    id: `target:${placed.name}`,
    kind: 'target',
    account,
    modelId: placed.modelId,
    routeNodeId: placed.seat.routeNodeId,
    depth: placed.seat.depth,
    detail: accountDetail(account, signedInAs),
  };
}

function routerCard(placed: PlacedRouteNode, node: RouterNode): CanvasNode {
  return {
    id: `route:${placed.name}`,
    kind: 'router',
    modelId: placed.modelId,
    routeNodeId: placed.seat.routeNodeId,
    depth: placed.seat.depth,
    mode: node.policy.mode,
    displayName: node.displayName,
    childCount: node.children.length,
  };
}

/**
 * The card one route node stands as, read against the registry as it stands now.
 *
 * @summary A router card carries what a person decides about it, which is the mode it spreads by
 * and how many children stand under it, and it keeps the name a person gave it rather than deriving
 * one, so the card and the inspector both read one stored fact. A target whose account left the
 * registry stands as a ghost, because a broken binding is what a person came back to repair. The
 * observed sign-in is handed over whatever kind of account stands there, because which kinds wear
 * an address is the account identity's own rule and stating it twice would let the two drift.
 */
export function routeCard(placed: PlacedRouteNode, registry: Registry): CanvasNode {
  return placed.seat.node.kind === 'router'
    ? routerCard(placed, placed.seat.node)
    : targetCard(placed, placed.seat.node, registry);
}
