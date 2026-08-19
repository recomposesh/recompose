import type { GatewayBranchPins } from '@recompose/contracts';

import { useQuery } from '@tanstack/react-query';

import { engineBranchPinsQueryOptions } from '../../../shared/api';

/** The one router a branch count belongs to: the gateway, the virtual model, and the node itself. */
export type RouterPlace = {
  slug: string;
  virtualModel: string;
  routeNode: string;
};

const HOLDING_NOTHING: ReadonlyMap<string, number> = new Map();

const NOTHING_IS_PINNED: GatewayBranchPins = {};

/**
 * How many conversations each branch of one router is holding, as its rows read it.
 *
 * @summary A map rather than the stored record, because the rows ask about one child at a time and
 * a record read by a caller's key would answer for `constructor` as readily as for a route node.
 * A router the snapshot says nothing about holds nothing rather than nothing-known: the engine
 * speaks the moment a branch moves, so silence means no conversation has earned one yet.
 */
export function branchPinsAt(
  pinning: GatewayBranchPins,
  place: RouterPlace,
): ReadonlyMap<string, number> {
  const counted = pinning[place.slug]?.[place.virtualModel]?.[place.routeNode];

  return counted === undefined ? HOLDING_NOTHING : new Map(Object.entries(counted));
}

/**
 * What one router's branches are holding right now, repainting as the engine says it changed.
 *
 * @summary The snapshot arrives by push rather than by asking, so a conversation pinned while the
 * inspector stands open moves the count under a person's eyes without anything on screen polling
 * for it.
 */
export function useBranchPinsAt(place: RouterPlace): ReadonlyMap<string, number> {
  const { data: pinning } = useQuery(engineBranchPinsQueryOptions);

  return branchPinsAt(pinning ?? NOTHING_IS_PINNED, place);
}
