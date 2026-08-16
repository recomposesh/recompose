import type { VirtualModel } from '@recompose/contracts';

import type { RouteAddress } from '../../lib/route-addresses';
import type { CanvasWorld } from './canvas-standings';

export function modelHolding(
  world: CanvasWorld,
  modelId: string | undefined,
): VirtualModel | undefined {
  return world.gateway.virtualModels.find((held) => held.id === modelId);
}

/**
 * The router a route address hangs under, read as the definition holding it and that router's id.
 *
 * @summary An address naming no route node stands for the definition's entry, because a cable let
 * go from a virtual model's own port is asking about the node its routing begins at. Both the acts
 * that write into a ladder and the act that takes a node out of one start here, so a definition
 * that left the gateway between the gesture and the write refuses in one place rather than two.
 */
export function parentRouterAt(world: CanvasWorld, address: RouteAddress) {
  const model = modelHolding(world, address.modelId);

  return model === undefined
    ? undefined
    : { model, routeNodeId: address.routeNodeId ?? model.routing.entry };
}
