import type { RoutingMemory } from './gateway-routing-memory';
import type { Crossing } from './gateway-wire';
import type { RotationPins } from './routing/walk-descent';

import { conversationFingerprint } from './gateway-conversation-key';

export type RotationPinScene = {
  crossing: Crossing;
  slug: string;
  virtualModel: string;
  memory: RoutingMemory;
};

/**
 * The child this one conversation keeps at every router that would otherwise spread it.
 *
 * @summary The conversation is bound here rather than inside the walk, which is what leaves the walk
 * knowing nothing about request bodies or dialects. It is recognized lazily, because a table holding
 * no round-robin router never asks and must pay no hash for the answer.
 */
export function rotationPins(scene: RotationPinScene): RotationPins {
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
