import type { RouterMode } from '../../lib/routing-edits';

const modeNames: Record<RouterMode, string> = {
  failover: 'Failover',
  'round-robin': 'Round-robin',
};

/**
 * What a router answers to, which is the name a person gave it or the mode it spreads by.
 *
 * @summary Every surface naming a router asks here, so the card, the inspector, and a refusal
 * never disagree about what to call one. Nothing names a router at creation, because the binding
 * ask drops one with no dialog, so the mode stands in until a person renames it.
 */
export function routerName(mode: RouterMode, displayName: string | undefined): string {
  return displayName ?? modeNames[mode];
}

/**
 * How many children the mono line says a router holds.
 *
 * @summary A router holding none says so in words rather than counting to zero, because a zero on
 * a card reads as a measurement where a person needs to see that the work is unfinished. The count
 * says children rather than targets, since a child of a router may be another router.
 */
export function childTally(count: number): string {
  if (count === 0) {
    return 'no child';
  }

  return count === 1 ? '1 child' : `${String(count)} children`;
}
