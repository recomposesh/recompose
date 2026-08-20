import type { RouteNodeAddress } from './routing/route-node-key';

import { tellingReaders } from './provider/telemetry-feed';

export type CooldownReading = { address: RouteNodeAddress; coolUntilMs: number };

export type CooldownListener = (reading: CooldownReading) => void;

const coolingListeners = new Set<CooldownListener>();

/**
 * Hands every stand-down one gateway orders to a reader, for as long as it wants them.
 *
 * @summary The moments ride a feed rather than a parameter threaded down the serving path, because
 * nothing between a refused call and the store that remembers it has any business knowing a window
 * is watching. The reading names its node, so one feed serves every gateway in the process without
 * one gateway's cooling ever standing another gateway's node down on a screen.
 */
export function subscribeToCooldowns(listener: CooldownListener): () => void {
  coolingListeners.add(listener);

  return () => {
    coolingListeners.delete(listener);
  };
}

/**
 * Says when one node stands back up, to whoever is listening.
 *
 * @summary Only the window crosses. A retry time the provider itself promised is remembered for the
 * refusal a later request builds, and a window that showed it would be printing a vendor's promise
 * as though this machine had made it. A reader that throws is logged and stepped over, because a
 * person waiting on an answer must never pay for a screen that stopped reading.
 */
export function publishCooldown(address: RouteNodeAddress, coolUntilMs: number): void {
  tellingReaders(coolingListeners, () => ({ address, coolUntilMs }), 'cooldown reading');
}
