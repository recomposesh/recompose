import type { GatewayConfig } from '@recompose/contracts';
import type { Connection, Edge } from '@xyflow/react';

import type { RouteAddress } from '../../lib/route-addresses';

import { addressUnder, addressWritten, routeNodeIn } from '../../lib/route-addresses';
import { accountBoundTo, modelIdOf, routerAddressOf, targetAccountIdIn } from './canvas-wiring';

/**
 * Whether a router may take the card a cable points at as one more child of its ladder.
 *
 * @summary A router's children are the whole of what it decides, so a cable leaving its port
 * binds one where the plus already does. A card the ladder already holds refuses, because a second
 * cable between the same pair would say the one-cable rule out loud and then break it, and a card
 * standing under another definition is always a fresh child rather than a duplicate.
 */
function targetAddressIn(gateway: GatewayConfig, nodeId: string): RouteAddress | undefined {
  const address = addressUnder(['target:', 'ghost:'], nodeId);

  return routeNodeIn(gateway, address)?.kind === 'target' ? address : undefined;
}

function laddersOnto(gateway: GatewayConfig, parent: RouteAddress, targetId: string): boolean {
  const router = routeNodeIn(gateway, parent);
  const landing = targetAddressIn(gateway, targetId);

  if (router?.kind !== 'router' || landing === undefined) {
    return false;
  }

  const standing = addressWritten(landing);

  return !router.children.some(
    (child) => addressWritten({ modelId: parent.modelId, routeNodeId: child }) === standing,
  );
}

/**
 * Whether a cable in flight may land where it points, which is the binding rule during a drag.
 *
 * @summary A cable leaves a virtual model, a draft, or a router, and lands on a stored target.
 * A model dropping onto the very account it already answers through refuses, because a second
 * cable to one target would say the rule out loud and then break it; any other account is a rebind,
 * which is one cable ending somewhere new. A router card takes no cable at all: every route node
 * already stands under exactly one parent, so a cable meeting one could only move it, and moving a
 * node is not a binding.
 */
export function oneTargetRule(gateway: GatewayConfig) {
  return (connection: Edge | Connection): boolean => {
    const parent = routerAddressOf(connection.source);

    if (parent !== undefined) {
      return laddersOnto(gateway, parent, connection.target);
    }

    const accountId = targetAccountIdIn(gateway, connection.target);

    if (accountId === undefined) {
      return false;
    }

    if (connection.source === 'draft') {
      return true;
    }

    const modelId = modelIdOf(connection.source);

    if (modelId === undefined) {
      return false;
    }

    return accountBoundTo(gateway, modelId) !== accountId;
  };
}

/**
 * Whether the cable one card is carrying could land on another, asked of any pair of cards.
 *
 * @summary It is the same rule the drop itself answers by rather than a second reading of it, so a
 * card cannot light up for a landing the release would then refuse. A pair naming no handle is what
 * a drag over open card face is: the rule reads the two cards, and the handles are the library's
 * business at the moment of release.
 */
export function cableLandings(gateway: GatewayConfig): (from: string, onto: string) => boolean {
  const stands = oneTargetRule(gateway);

  return (from, onto) =>
    stands({ source: from, target: onto, sourceHandle: null, targetHandle: null });
}
