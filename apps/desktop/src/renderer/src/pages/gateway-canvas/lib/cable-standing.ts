import type { XY } from './canvas-positions';
import type { CableFailure, CableStanding } from './node-graph';
import type { BranchSeat } from './route-graph';

import { CABLE_SPAN } from './tidy-layout';

/** The pointer target every cable end and its snap radius is sized by, in pixels. */
export const CABLE_GRAB_SPAN = 24;

/** How far along a branch cable its rule pill rides, leaving the midpoint to the failure chip. */
export const RULE_PILL_ANCHOR = 0.35;

const PILL_PADDING = 12;

const CAPTION_ADVANCE = 6;

/** How many characters a rule pill prints before it cuts, sized by the span a cable crosses. */
export const RULE_PILL_CHARACTERS = Math.floor((CABLE_SPAN - PILL_PADDING) / CAPTION_ADVANCE);

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

const standingPulse: Record<CableStanding, string> = {
  resting: '',
  live: 'cable-pulse',
  served: '',
  failed: '',
  broken: '',
  draft: '',
  pending: '',
  structural: '',
};

const strokeCarried: ReadonlyMap<unknown, string> = new Map(Object.entries(standingStroke));
const tintCarried: ReadonlyMap<unknown, string> = new Map(Object.entries(standingTint));
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
 * The pulse that travels the length of a cable for the standing it carries.
 *
 * @summary Only a live binding pulses, because a request still in flight is the one thing on this
 * canvas that is actually moving. The pulse rides over the cable rather than breaking it into
 * dashes, because an unbroken line is what a working connection looks like and breaking it to show
 * movement would say the opposite. Riding over rather than replacing is also what lets the standing
 * survive the pulse standing down under reduced motion.
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
 * The rule a pill prints on the cable it rides, cut to what the span between two columns holds.
 *
 * @summary A person writes a rule as long as the judge needs, and a pill that grew with it would
 * cover the cards at both ends of the cable it rides. The cut keeps the pill inside the clear span,
 * and the full rule stays one press away rather than crowding the composition it explains.
 */
export function ruleShown(rule: string): string {
  if (rule.length <= RULE_PILL_CHARACTERS) {
    return rule;
  }

  return `${rule.slice(0, RULE_PILL_CHARACTERS - 1)}…`;
}

const CUBIC_NUMBERS = 8;

function numbersIn(path: string): readonly number[] {
  return [...path.matchAll(/-?\d+(?:\.\d+)?/gu)].map(([held]) => Number(held));
}

function cubicAt(along: readonly number[], part: number): number {
  const [from = 0, first = 0, second = 0, to = 0] = along;
  const rest = 1 - part;

  return (
    rest ** 3 * from + 3 * rest ** 2 * part * first + 3 * rest * part ** 2 * second + part ** 3 * to
  );
}

/**
 * The point a fraction of the way along one cable, which is where furniture that is not centered rides.
 *
 * @summary A cable is one cubic curve, so a fraction of it is that curve read at that fraction
 * rather than a fraction of the straight line between its ends: a pill placed on the chord would
 * float off a cable that bows, which is every cable between two columns. A path this canvas did not
 * draw as one cubic answers nothing, so the furniture falls back to the midpoint the library already
 * hands over rather than landing at the origin.
 */
export function pointAlongCable(path: string, fraction: number): XY | undefined {
  const held = numbersIn(path);

  if (held.length !== CUBIC_NUMBERS) {
    return undefined;
  }

  const across = held.filter((_, place) => place % 2 === 0);
  const down = held.filter((_, place) => place % 2 === 1);

  return { x: cubicAt(across, fraction), y: cubicAt(down, fraction) };
}

function bothHalvesOfARule(carried: object): carried is Record<'label' | 'rule', unknown> {
  return 'label' in carried && 'rule' in carried;
}

function labeledSeat(carried: object): BranchSeat | undefined {
  if (!bothHalvesOfARule(carried)) {
    return undefined;
  }

  const { label, rule } = carried;

  return typeof label === 'string' && typeof rule === 'string'
    ? { kind: 'rule', label, rule }
    : undefined;
}

/**
 * The branch a cable draws for, read off the loose data the library hands the edge.
 *
 * @summary A cable carrying anything short of both halves of a rule carries no branch at all, so a
 * pill never stands offering a rule it cannot finish saying, and a cable under a router that reads
 * no request carries nothing here at all.
 */
export function branchIn(carried: unknown): BranchSeat | undefined {
  if (!(carried instanceof Object) || !('kind' in carried)) {
    return undefined;
  }

  const { kind } = carried;

  if (kind === 'else') {
    return { kind: 'else' };
  }

  return kind === 'rule' ? labeledSeat(carried) : undefined;
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
