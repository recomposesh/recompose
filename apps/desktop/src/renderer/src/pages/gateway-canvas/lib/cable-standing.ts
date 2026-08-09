import type { CableStanding } from './node-graph';

/** The pointer target every cable end and its snap radius is sized by, in pixels. */
export const CABLE_GRAB_SPAN = 24;

const standingStroke: Record<CableStanding, string> = {
  resting: 'stroke-cable-resting',
  live: 'stroke-cable-live',
  broken: 'stroke-cable-broken',
  draft: 'stroke-cable-draft',
  pending: 'stroke-cable-pending',
};

const standingTint: Record<CableStanding, string> = {
  resting: 'node-tint-cable-resting',
  live: 'node-tint-cable-live',
  broken: 'node-tint-cable-broken',
  draft: 'node-tint-cable-draft',
  pending: 'node-tint-cable-pending',
};

const strokeCarried: ReadonlyMap<unknown, string> = new Map(Object.entries(standingStroke));
const tintCarried: ReadonlyMap<unknown, string> = new Map(Object.entries(standingTint));

function painted(known: ReadonlyMap<unknown, string>, carried: unknown, resting: string): string {
  return known.get(carried) ?? resting;
}

/**
 * The stroke a cable paints for the standing it carries.
 *
 * @summary A cable reads its standing off the graph, which the library hands over as loose data, so
 * a standing this canvas has no tint for falls back to resting rather than leaving a cable unpainted
 * and a binding invisible.
 */
export function strokeForStanding(carried: unknown): string {
  return painted(strokeCarried, carried, standingStroke.resting);
}

/**
 * The tint the furniture at a cable's ends paints in, which is the cable's own standing.
 *
 * @summary A grab handle belongs to the cable rather than to the card it lands on, so it carries the
 * cable's tint: a broken binding stays broken all the way to the hand that comes to repair it.
 */
export function tintForStanding(carried: unknown): string {
  return painted(tintCarried, carried, standingTint.resting);
}

/**
 * The stroke a cable in flight paints for what letting go right there would do.
 *
 * @summary Over a port that would take the cable it reads live, over one that would refuse it reads
 * broken, and over open canvas it reads pending, because the release there opens the picker rather
 * than binding anything.
 */
export function strokeForRelease(status: 'invalid' | 'valid' | null): string {
  if (status === 'valid') {
    return standingStroke.live;
  }

  return status === 'invalid' ? standingStroke.broken : standingStroke.pending;
}
