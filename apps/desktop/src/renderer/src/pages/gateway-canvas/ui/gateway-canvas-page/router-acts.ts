import type { GatewayConfig, VirtualModel } from '@recompose/contracts';

import { mintRouteNodeId, nameOfRouter } from '@recompose/contracts';

import type { RouteAddress } from '../../lib/route-addresses';
import type { RouterMode } from '../../lib/routing-edits';
import type { CanvasWorld } from './canvas-standings';

import { closeInspector } from '../../../../shared/lib';
import { emptyDefinition, gatewayDefiningRouted } from '../../lib/model-draft';
import { addressWritten } from '../../lib/route-addresses';
import {
  gatewayBindingChild,
  gatewayDroppingNode,
  gatewayRebindingNode,
  gatewayRoutingThrough,
} from '../../lib/routing-edits';
import { heldDraft } from '../../lib/use-held-draft';
import {
  committedPick,
  graduatedDraft,
  releasedWithNothingSelected,
  targetNameIn,
} from './binding-acts';
import { cardAddressOf, modelIdOf, routerAddressOf } from './canvas-wiring';

/**
 * The mode a router is born in, since the binding ask drops one without a dialog.
 *
 * @summary Failover is the mode a person can reason about without reading anything: the first
 * child answers and the rest stand in. Round-robin trades the prompt cache for spread, which is a
 * choice worth making on purpose in the inspector rather than one to inherit from a drop.
 */
const BORN_ROUTER_MODE: RouterMode = 'failover';

const BORN_ROUTER_NAME = nameOfRouter(BORN_ROUTER_MODE);

function modelHolding(world: CanvasWorld, modelId: string | undefined): VirtualModel | undefined {
  return world.gateway.virtualModels.find((held) => held.id === modelId);
}

function definedThroughARouter(world: CanvasWorld): void {
  const definition = heldDraft(world.slug)?.definition ?? emptyDefinition();
  const named = { id: definition.id, displayName: definition.displayName };

  committedPick(
    world,
    `route:${named.id}`,
    gatewayDefiningRouted(world.gateway, named, BORN_ROUTER_MODE),
    () => {
      graduatedDraft(world, named, BORN_ROUTER_NAME);
    },
  );
}

function routedThroughANewRouter(world: CanvasWorld, modelId: string): void {
  const model = modelHolding(world, modelId);

  if (model === undefined) {
    return;
  }

  committedPick(
    world,
    `route:${modelId}`,
    gatewayRoutingThrough(world.gateway, modelId, BORN_ROUTER_MODE),
    () => {
      world.standings.announce({
        kind: 'rebound',
        virtualModel: model.displayName,
        target: BORN_ROUTER_NAME,
      });
    },
  );
}

function parentRouterAt(world: CanvasWorld, address: RouteAddress) {
  const model = modelHolding(world, address.modelId);

  return model === undefined
    ? undefined
    : { model, routeNodeId: address.routeNodeId ?? model.routing.entry };
}

function nestedUnderARouter(world: CanvasWorld, address: RouteAddress): void {
  const parent = parentRouterAt(world, address);

  if (parent === undefined) {
    return;
  }

  const born = mintRouteNodeId();

  committedPick(
    world,
    `route:${addressWritten({ modelId: address.modelId, routeNodeId: born })}`,
    gatewayBindingChild(world.gateway, address.modelId, parent.routeNodeId, born, {
      kind: 'router',
      policy: { mode: BORN_ROUTER_MODE },
      children: [],
    }),
    () => {
      world.standings.announce({
        kind: 'bound',
        virtualModel: parent.model.displayName,
        target: BORN_ROUTER_NAME,
      });
    },
  );
}

/**
 * Answers the binding ask with a router, wherever the cable that opened it left from.
 *
 * @summary One ask serves three shapes of the same intent. A draft finishes as a definition
 * routing through a router, so a person composing top down never detours through a target they
 * did not want. A bound definition takes the router in its binding's place and keeps what stood
 * there as the router's first child, which is what dropping a router onto a bound model means. A
 * router's own port nests another, so one gesture reaches a nested router rather than two.
 */
export function boundThroughARouter(world: CanvasWorld, from: string): void {
  const address = routerAddressOf(from);

  if (address !== undefined) {
    nestedUnderARouter(world, address);

    return;
  }

  const modelId = modelIdOf(from);

  if (modelId !== undefined) {
    routedThroughANewRouter(world, modelId);

    return;
  }

  if (from === 'draft') {
    definedThroughARouter(world);
  }
}

/** The ladder a binding ask left from, or nothing where the definition holding it has left. */
function ladderAsking(world: CanvasWorld, address: RouteAddress) {
  const parent = parentRouterAt(world, address);

  return parent === undefined ? undefined : { address, parent };
}

type LadderAsking = NonNullable<ReturnType<typeof ladderAsking>>;

type LandedChild = {
  routeNodeId: string;
  rewritten: GatewayConfig;
  outcome: 'bound' | 'rebound';
};

/**
 * Writes one target into a route node of a ladder and says out loud what became of it.
 *
 * @summary Joining a ladder and moving a binding along it write different documents and read as
 * different words, but both stand one target card under one router, so the card's name and the
 * sentence a person hears are decided in one place rather than twice.
 */
function committedChild(
  world: CanvasWorld,
  asking: LadderAsking,
  landed: LandedChild,
  accountId: string,
): void {
  const { modelId } = asking.address;

  committedPick(
    world,
    `target:${addressWritten({ modelId, routeNodeId: landed.routeNodeId })}`,
    landed.rewritten,
    () => {
      world.standings.announce({
        kind: landed.outcome,
        virtualModel: asking.parent.model.displayName,
        target: targetNameIn(world.accounts, accountId),
      });
    },
  );
}

/**
 * Binds a picked account and real model as one more child of the router the ask came from.
 *
 * @summary A child joins the end of the ladder rather than the front, because failover walks its
 * children in declared order and a new binding jumping ahead would reroute live traffic nobody
 * asked to reroute. The card is named here rather than by the write, so the target a person let a
 * cable go for stands exactly where they let it go.
 */
export function completedChildPick(
  world: CanvasWorld,
  address: RouteAddress,
  accountId: string,
  providerModel: string,
): void {
  const asking = ladderAsking(world, address);

  if (asking === undefined) {
    return;
  }

  const born = mintRouteNodeId();
  const { modelId } = asking.address;

  committedChild(
    world,
    asking,
    {
      routeNodeId: born,
      outcome: 'bound',
      rewritten: gatewayBindingChild(world.gateway, modelId, asking.parent.routeNodeId, born, {
        kind: 'target',
        accountId,
        providerModel,
      }),
    },
    accountId,
  );
}

/**
 * Aims one child of a ladder at the picked target, in the place that child already stands.
 *
 * @summary Letting a child's cable go on another stored target moves that binding, so the write
 * lands on the route node the cable already ended at rather than on a fresh one: appending would
 * leave the child a person was rearranging still standing and lengthen the ladder they meant to
 * aim. The rank survives because the id does, which is what keeps failover trying the pool in the
 * order a person put it in.
 */
export function completedChildRebindPick(
  world: CanvasWorld,
  address: RouteAddress,
  replacing: string,
  accountId: string,
  providerModel: string,
): void {
  const asking = ladderAsking(world, address);

  if (asking === undefined) {
    return;
  }

  committedChild(
    world,
    asking,
    {
      routeNodeId: replacing,
      outcome: 'rebound',
      rewritten: gatewayRebindingNode(world.gateway, asking.address.modelId, replacing, {
        kind: 'target',
        accountId,
        providerModel,
      }),
    },
    accountId,
  );
}

/**
 * Takes one route node off the canvas, with everything standing under it.
 *
 * @summary One act serves a target card and a router card, because both stand for a route node and
 * a route node leaves the same way whichever it is. A node below the entry leaves the ladder
 * holding it and the definition keeps serving through whatever else stands there, which is what a
 * person thinning a pool by one asked for. The entry has nothing above it to leave, so removing it
 * releases the binding altogether and stands the definition back as a draft, the way deleting the
 * one thing a virtual model reached has always worked on this canvas.
 */
export function removedRouteNode(world: CanvasWorld, nodeId: string): void {
  const address = cardAddressOf(nodeId);
  const parent = address === undefined ? undefined : parentRouterAt(world, address);

  if (address === undefined || parent === undefined) {
    return;
  }

  if (parent.routeNodeId === parent.model.routing.entry) {
    releasedWithNothingSelected(world, address.modelId);

    return;
  }

  world.define.mutate(gatewayDroppingNode(world.gateway, address.modelId, parent.routeNodeId), {
    onSuccess: () => {
      world.standings.select(undefined);
      closeInspector();
    },
    onError: world.standings.refuse,
  });
}
