import type { CableFailure, CableStanding } from './node-graph';

/** The pointer target every cable end and its snap radius is sized by, in pixels. */
export const CABLE_GRAB_SPAN = 24;

const standingStroke: Record<CableStanding, string> = {
  resting: 'stroke-cable-resting',
  live: 'stroke-cable-live',
  served: 'stroke-cable-served',
  failed: 'stroke-cable-failed',
  broken: 'stroke-cable-broken',
  draft: 'stroke-cable-draft',
  pending: 'stroke-cable-pending',
  structural: 'stroke-cable-resting',
};

const standingTint: Record<CableStanding, string> = {
  resting: 'node-tint-cable-resting',
  live: 'node-tint-cable-live',
  served: 'node-tint-cable-served',
  failed: 'node-tint-cable-failed',
  broken: 'node-tint-cable-broken',
  draft: 'node-tint-cable-draft',
  pending: 'node-tint-cable-pending',
  structural: 'node-tint-cable-resting',
};

const standingMarch: Record<CableStanding, string> = {
  resting: '',
  live: '',
  served: '',
  failed: 'cable-march',
  broken: '',
  draft: '',
  pending: '',
  structural: '',
};

const standingPulse: Record<CableStanding, string> = {
  resting: '',
  live: '',
  served: 'cable-pulse',
  failed: '',
  broken: '',
  draft: '',
  pending: '',
  structural: '',
};

const strokeCarried: ReadonlyMap<unknown, string> = new Map(Object.entries(standingStroke));
const tintCarried: ReadonlyMap<unknown, string> = new Map(Object.entries(standingTint));
const marchCarried: ReadonlyMap<unknown, string> = new Map(Object.entries(standingMarch));
const pulseCarried: ReadonlyMap<unknown, string> = new Map(Object.entries(standingPulse));

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
 * The march a cable runs along its own path for the standing it carries.
 *
 * @summary Only a failed binding marches, because a line broken into dashes is what a failure looks
 * like before any colour is read, which is what carries the standing to a person who cannot tell
 * the greens from the reds. It stands down under reduced motion, where the colour carries alone.
 */
export function marchForStanding(carried: unknown): string {
  return painted(marchCarried, carried, standingMarch.resting);
}

/**
 * The pulse that travels the length of a cable for the standing it carries.
 *
 * @summary A served binding sends a pulse along a line that stays whole, because an unbroken line
 * is what a working connection looks like and breaking it to show movement would say the opposite.
 * The pulse rides over the cable rather than replacing it, so the standing survives the pulse
 * standing down under reduced motion.
 */
export function pulseForStanding(carried: unknown): string {
  return painted(pulseCarried, carried, standingPulse.resting);
}

function bothHalvesNamed(carried: unknown): carried is Record<'status' | 'detail', unknown> {
  return carried instanceof Object && 'status' in carried && 'detail' in carried;
}

/**
 * The failure a cable carries, read off the loose data the library hands the edge.
 *
 * @summary A cable carrying anything short of both halves of a failure carries none, so a chip
 * never stands offering an error it cannot finish saying.
 */
export function failureIn(carried: unknown): CableFailure | undefined {
  if (!bothHalvesNamed(carried)) {
    return undefined;
  }

  const { status, detail } = carried;

  return typeof status === 'number' && typeof detail === 'string' ? { status, detail } : undefined;
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
