import type { RoutingMemory } from './gateway-routing-memory';
import type { Crossing } from './gateway-wire';
import type { RotationPins } from './routing/walk-descent';

import { conversationFingerprint, conversationTellsItselfApart } from './gateway-conversation-key';

export type RotationPinScene = {
  crossing: Crossing;
  slug: string;
  virtualModel: string;
  memory: RoutingMemory;
};

const NO_CHILD_KEPT: RotationPins = {
  pinnedChildAt: () => undefined,
  pinChildAt: () => undefined,
};

/**
 * The child this one conversation keeps at every router that would otherwise spread it.
 *
 * @summary The conversation is bound here rather than inside the walk, which is what leaves the walk
 * knowing nothing about request bodies or dialects. It is recognized lazily, because a table holding
 * no round-robin router never asks and must pay no hash for the answer.
 *
 * A request the gateway can't tell apart from the next one keeps no child at all, and its sealed
 * turns meet the refusal instead. Following a mark two conversations share would send this turn to
 * an account that never minted its state, which reads to the caller as the provider rejecting a
 * token rather than as a gateway that lost track of them.
 */
export function rotationPins(scene: RotationPinScene): RotationPins {
  if (!conversationTellsItselfApart(scene.crossing)) return NO_CHILD_KEPT;

  let marked: string | undefined;

  const fingerprint = (): string => {
    marked ??= conversationFingerprint(scene.crossing);

    return marked;
  };

  const addressOf = (routeNode: string) => ({
    slug: scene.slug,
    virtualModel: scene.virtualModel,
    routeNode,
  });

  return {
    pinnedChildAt: (routeNode) =>
      scene.memory.rotationPins.pinnedAt(addressOf(routeNode), fingerprint()),
    pinChildAt: (routeNode, child) => {
      scene.memory.rotationPins.pin(addressOf(routeNode), fingerprint(), child);
    },
  };
}
