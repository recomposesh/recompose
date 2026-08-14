import type { EngineRouting, RequestOutcome } from '@recompose/contracts';

import type { RouterAttempt } from './refusal-wire';
import type { WalkResult } from './routing/attempt-walk';

export type WalkNote = WalkResult<never>['notes'][number];

const UNREACHED_STATUS = 502;

/**
 * The name a person reads a child by, which is the model it serves rather than the seat it sits in.
 *
 * @summary The seat name is a minted id and says nothing to anyone, while the account paying for the
 * child never crosses into the engine at all. What is left, and what a person actually recognizes, is
 * the provider model the child was bound to. A child whose account left names its seat, because that
 * is the only handle left once the model went with the account.
 */
function childNameOf(routing: EngineRouting, routeNode: string): string {
  const node = routing.nodes[routeNode];

  return node?.kind === 'target' && node.standing.standing === 'bound'
    ? node.standing.providerModel
    : routeNode;
}

/**
 * Why one child could not take the request, in the words a refusal hands a person.
 *
 * @summary The walk records facts and no copy at all, so the sentence a person reads is written here
 * and only here. A child that stood cooling reads as such rather than as a failure of this request,
 * because it never carried one.
 */
function whyOf(note: WalkNote): string {
  const reason = note.reason;

  if (reason.because === 'refused') return `refused with ${String(reason.status)}`;

  if (reason.because === 'stream-error') return `failed mid-stream with ${String(reason.status)}`;

  if (reason.because === 'missing-credential') return 'has no credential';

  return reason.because === 'transport-failure' ? 'could not be reached' : 'stands cooling';
}

function statusOf(note: WalkNote): number {
  const reason = note.reason;

  return reason.because === 'refused' || reason.because === 'stream-error'
    ? reason.status
    : UNREACHED_STATUS;
}

/**
 * The attempts an exhausted refusal enumerates, in the order the table declares its children.
 *
 * @summary Every child the walk touched appears, whether it was tried and refused or skipped because
 * it stood cooling, because a person asking why nothing served needs the whole ladder rather than the
 * last rung.
 */
export function attemptsRecorded(
  routing: EngineRouting,
  notes: readonly WalkNote[],
): readonly RouterAttempt[] {
  return notes.map((note) => ({ child: childNameOf(routing, note.routeNode), why: whyOf(note) }));
}

/**
 * The notes standing for a request that actually left the machine.
 *
 * @summary A cooling child is named in the refusal and left out of traffic, because a cable paints
 * what the last request came to and a child never tried carried no request to come to anything.
 */
export function notesThatCarriedARequest(notes: readonly WalkNote[]): readonly WalkNote[] {
  return notes.filter((note) => note.reason.because !== 'cooling');
}

/**
 * What one failed attempt paints on its own cable.
 *
 * @summary The status is the provider's own where one came back, and the unreachable status where
 * none did, so a cable never claims a code no one answered with.
 */
export function failedOutcome(note: WalkNote, at: number): RequestOutcome {
  return { outcome: 'failed', at, status: statusOf(note), detail: `The child ${whyOf(note)}.` };
}
