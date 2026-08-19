import type { BranchPinTally } from '@recompose/contracts';

import type { RouteNodeAddress } from './routing/route-node-key';

import { tellingReaders } from './provider/telemetry-feed';

export type BranchPinTallyReading = { address: RouteNodeAddress; pinned: BranchPinTally };

export type BranchPinTallyListener = (reading: BranchPinTallyReading) => void;

const tallyListeners = new Set<BranchPinTallyListener>();

/**
 * Hands every branch count one gateway keeps to a reader, for as long as it wants them.
 *
 * @summary The counts ride a feed rather than a parameter threaded down the serving path, because
 * nothing between the request and the pin store has any business knowing a window is watching. The
 * reading names its router, so one feed serves every gateway in the process without the routers of
 * one ever being added into the counts of another.
 */
export function subscribeToBranchPinTallies(listener: BranchPinTallyListener): () => void {
  tallyListeners.add(listener);

  return () => {
    tallyListeners.delete(listener);
  };
}

/**
 * Says what one router is holding now, to whoever is listening.
 *
 * @summary A reader that throws is logged and stepped over rather than raised, because a person
 * waiting on an answer must never pay for a screen that stopped reading.
 */
export function publishBranchPinTally(address: RouteNodeAddress, pinned: BranchPinTally): void {
  tellingReaders(tallyListeners, () => ({ address, pinned }), 'branch pin tally');
}
