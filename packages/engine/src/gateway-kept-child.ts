import type { RouteNodeAddress } from './routing/route-node-key';

/** One conversation's child at one route node, flat enough for whatever outlives the process. */
export type KeptChild = RouteNodeAddress & {
  fingerprint: string;
  child: string;
  touchedAtMs: number;
};

/**
 * Whatever holds a gateway's kept children while no gateway is running.
 *
 * @summary The store hands over its whole set rather than each write, because the set is already
 * aged and bounded and a keeper replaying a stream of writes would have to age and bound it a second
 * time. One authority decides which conversations are still worth remembering.
 */
export type PinKeeping = {
  restored: () => readonly KeptChild[];
  keep: (records: readonly KeptChild[]) => void;
};
