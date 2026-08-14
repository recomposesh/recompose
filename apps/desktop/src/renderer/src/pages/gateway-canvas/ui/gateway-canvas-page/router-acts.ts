import type { VirtualModel } from '@recompose/contracts';

import type { RouterMode } from '../../lib/routing-edits';
import type { CanvasWorld } from './canvas-standings';
import type { SeatReading } from './route-seats';

import { emptyDefinition, gatewayDefiningRouted } from '../../lib/model-draft';
import { gatewayBindingChild, gatewayRoutingThrough } from '../../lib/routing-edits';
import { heldDraft } from '../../lib/use-held-draft';
import { routerName } from '../router-node/router-reading';
import { committedPick, graduatedDraft, targetNameIn } from './binding-acts';
import { modelIdOf, routerSeatOf } from './canvas-wiring';

/**
 * The mode a router is born in, since the binding ask drops one without a dialog.
 *
 * @summary Failover is the mode a person can reason about without reading anything: the first
 * child answers and the rest stand in. Round-robin trades the prompt cache for spread, which is a
 * choice worth making on purpose in the inspector rather than one to inherit from a drop.
 */
const BORN_ROUTER_MODE: RouterMode = 'failover';

const BORN_ROUTER_NAME = routerName(BORN_ROUTER_MODE, undefined);

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

function parentRouterAt(world: CanvasWorld, seat: SeatReading) {
  const model = modelHolding(world, seat.modelId);

  return model === undefined
    ? undefined
    : { model, routeNodeId: seat.routeNodeId ?? model.routing.entry };
}

function nestedUnderARouter(world: CanvasWorld, seat: SeatReading): void {
  const parent = parentRouterAt(world, seat);

  if (parent === undefined) {
    return;
  }

  committedPick(
    world,
    `route:${seat.modelId}`,
    gatewayBindingChild(world.gateway, seat.modelId, parent.routeNodeId, {
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
  const seat = routerSeatOf(from);

  if (seat !== undefined) {
    nestedUnderARouter(world, seat);

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

/**
 * Binds a picked account and real model as one more child of the router the ask came from.
 *
 * @summary A child joins the end of the ladder rather than the front, because failover walks its
 * children in declared order and a new binding jumping ahead would reroute live traffic nobody
 * asked to reroute. The child takes the seat the layout derives from its depth rather than the
 * drop point, since the stored table mints its id inside the write and nothing here can name the
 * card before it exists.
 */
export function completedChildPick(
  world: CanvasWorld,
  from: string,
  accountId: string,
  providerModel: string,
): void {
  const seat = routerSeatOf(from);
  const parent = seat === undefined ? undefined : parentRouterAt(world, seat);

  if (seat === undefined || parent === undefined) {
    return;
  }

  committedPick(
    world,
    `route:${seat.modelId}`,
    gatewayBindingChild(world.gateway, seat.modelId, parent.routeNodeId, {
      kind: 'target',
      accountId,
      providerModel,
    }),
    () => {
      world.standings.announce({
        kind: 'bound',
        virtualModel: parent.model.displayName,
        target: targetNameIn(world.accounts, accountId),
      });
    },
  );
}
