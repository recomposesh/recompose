import type {
  Account,
  RouterPolicy,
  RouteTarget,
  SubscriptionAccountView,
} from '@recompose/contracts';

import type { BranchSeat, WalkedRouteNode } from './route-graph';

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
      providerModel: string;
      routeNodeId: string;
      depth: number;
      branch?: BranchSeat | undefined;
      detail?: string;
    }
  | {
      id: string;
      kind: 'ghost-target';
      accountId: string;
      modelId: string;
      routeNodeId: string;
      depth: number;
      branch?: BranchSeat | undefined;
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
      branch?: BranchSeat | undefined;
    }
  | {
      id: string;
      kind: 'judge';
      modelId: string;
      routeNodeId: string;
      depth: number;
      advises: string;
      accountId: string;
      providerModel: string;
    }
  | { id: string; kind: 'draft-model'; modelId: string; displayName: string }
  | { id: string; kind: 'pending-target' };

/** Which card a node stands as, which is what decides the column it seats in. */
export type CanvasNodeKind = CanvasNode['kind'];

/** One route node placed on the canvas, holding the name its card and its cable both read. */
export type PlacedRouteNode = {
  modelId: string;
  name: string;
  parentName: string | undefined;
  walked: WalkedRouteNode;
};

/** The registry a target card reads itself against, as the drawer holds it. */
export type Registry = {
  accounts: readonly Account[];
  subscriptions: readonly SubscriptionAccountView[];
};

type RouterNode = Extract<WalkedRouteNode['node'], { kind: 'router' }>;

function ghostCard(placed: PlacedRouteNode, bound: RouteTarget): CanvasNode {
  return {
    id: `ghost:${placed.name}`,
    kind: 'ghost-target',
    accountId: bound.accountId,
    modelId: placed.modelId,
    routeNodeId: placed.walked.routeNodeId,
    depth: placed.walked.depth,
    branch: placed.walked.branch,
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
    providerModel: bound.providerModel,
    routeNodeId: placed.walked.routeNodeId,
    depth: placed.walked.depth,
    branch: placed.walked.branch,
    detail: accountDetail(account, signedInAs),
  };
}

function routerCard(placed: PlacedRouteNode, node: RouterNode): CanvasNode {
  return {
    id: `route:${placed.name}`,
    kind: 'router',
    modelId: placed.modelId,
    routeNodeId: placed.walked.routeNodeId,
    depth: placed.walked.depth,
    mode: node.policy.mode,
    displayName: node.displayName,
    childCount: node.children.length,
    branch: placed.walked.branch,
  };
}

function judgeCard(placed: PlacedRouteNode, bound: RouteTarget): CanvasNode {
  return {
    id: `judge:${placed.name}`,
    kind: 'judge',
    modelId: placed.modelId,
    routeNodeId: placed.walked.routeNodeId,
    depth: placed.walked.depth,
    advises: `route:${placed.parentName ?? placed.modelId}`,
    accountId: bound.accountId,
    providerModel: bound.providerModel,
  };
}

function boundCard(placed: PlacedRouteNode, bound: RouteTarget, registry: Registry): CanvasNode {
  return placed.walked.advises === undefined
    ? targetCard(placed, bound, registry)
    : judgeCard(placed, bound);
}

/**
 * The card one route node stands as, read against the registry as it stands now.
 *
 * @summary A router card carries what a person decides about it, which is the mode it spreads by
 * and how many children stand under it, and it keeps the name a person gave it rather than deriving
 * one, so the card and the inspector both read one stored fact. A target whose account left the
 * registry stands as a ghost, because a broken binding is what a person came back to repair. The
 * observed sign-in is handed over whatever kind of account stands there, because which kinds wear
 * an address is the account identity's own rule and stating it twice would let the two drift. A
 * card a judge's branch reaches carries that branch, so the card and the cable arriving at it read
 * one branch rather than two lookups that can disagree about which rule sends requests here. A
 * judge stands as its own kind of card rather than as one more target, because it takes no request
 * and a card that looked like a target would say a person could route to it.
 */
export function routeCard(placed: PlacedRouteNode, registry: Registry): CanvasNode {
  return placed.walked.node.kind === 'router'
    ? routerCard(placed, placed.walked.node)
    : boundCard(placed, placed.walked.node, registry);
}
