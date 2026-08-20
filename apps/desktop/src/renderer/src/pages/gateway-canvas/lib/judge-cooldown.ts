import type { GatewayCooldowns } from '@recompose/contracts';

import { useQuery } from '@tanstack/react-query';

import { engineCooldownsQueryOptions } from '../../../shared/api';
import { heldAt } from './held-at';

/** The one node a stand-down belongs to: the gateway, the virtual model, and the node itself. */
export type NodePlace = { slug: string; virtualModel: string; routeNode: string };

const NOTHING_STANDS_DOWN: GatewayCooldowns = {};

const backUpClock = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** The moment one node is ready again, or nothing where nothing stood it down. */
export function standsDownAt(cooling: GatewayCooldowns, place: NodePlace): number | undefined {
  return heldAt(heldAt(heldAt(cooling, place.slug), place.virtualModel), place.routeNode);
}

/**
 * The clock time a node standing down is expected back by, or nothing where it already is.
 *
 * @summary A clock rather than a span, because the inspector prints this once and never repaints
 * it: a span would go stale the second after it was drawn, and keeping one honest costs a number
 * ticking on screen while a person is trying to read the composition behind it. A window already
 * behind the clock reads as nothing, so a judge that stood back up says nothing rather than
 * printing a moment that has passed.
 */
export function backUpClockAt(
  cooling: GatewayCooldowns,
  place: NodePlace,
  now: number,
): string | undefined {
  const coolUntilMs = standsDownAt(cooling, place);

  return coolUntilMs === undefined || coolUntilMs <= now
    ? undefined
    : backUpClock.format(new Date(coolUntilMs));
}

/**
 * When the node at this place is expected back, repainting as the engine says it changed.
 *
 * @summary The snapshot arrives by push rather than by asking, so a judge refused while the
 * inspector stands open says so under a person's eyes without anything on screen polling for it.
 */
export function useBackUpClockAt(place: NodePlace, now: number = Date.now()): string | undefined {
  const { data: cooling } = useQuery(engineCooldownsQueryOptions);

  return backUpClockAt(cooling ?? NOTHING_STANDS_DOWN, place, now);
}
