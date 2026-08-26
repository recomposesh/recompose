import type { EngineRouting, FailureDiagnosis, RequestOutcome } from '@recompose/contracts';

import type { RouterAttempt } from './refusal-wire';
import type { WalkResult } from './routing/attempt-walk';
import type { OffBranchReason } from './routing/walk-notes';

export type WalkNote = WalkResult<never>['notes'][number];

type FailedOutcome = Extract<RequestOutcome, { outcome: 'failed' }>;

const UNREACHED_STATUS = 502;

/**
 * The name a person reads a child by, which is the model it serves rather than the node it sits in.
 *
 * @summary The route node id is minted and says nothing to anyone, while the account paying for the
 * child never crosses into the engine at all. What is left, and what a person actually recognizes, is
 * the provider model the child was bound to. A child whose account left names its node, because that
 * is the only handle left once the model went with the account.
 */
function childNameOf(routing: EngineRouting, routeNode: string): string {
  const node = routing.nodes[routeNode];

  return node?.kind === 'target' && node.standing.standing === 'bound'
    ? node.standing.providerModel
    : routeNode;
}

type UnansweredReason = Exclude<WalkNote['reason']['because'], 'refused' | 'stream-error'>;

/**
 * Why a child nobody ever answered for could not take the request.
 *
 * @summary A child whose account left the registry is told apart from one whose account is still
 * there without a credential, because the two ask a person for different repairs. A child that stood
 * cooling reads as such rather than as a failure of this request, because it never carried one, and
 * a child a branch decision walked past reads as ready rather than as anything at all wrong with it.
 * The words sit in a record the compiler holds to the reasons, so a reason added later fails the
 * build here rather than quietly printing somebody else's sentence.
 */
const WHY_NOTHING_ANSWERED: Record<UnansweredReason, string> = {
  'missing-credential': 'has no credential',
  'missing-target': 'has no target',
  'transport-failure': 'could not be reached',
  cooling: 'stands cooling',
  'off-branch': 'stands ready off the branch this request was judged onto',
};

/**
 * Why one child could not take the request, in the words a refusal hands a person.
 *
 * @summary The walk records facts and no copy at all, so the sentence a person reads is written here
 * and only here. A status appears only where a provider answered with one, so the two reasons that
 * carry one are split from every reason nothing ever answered for.
 */
function whyOf(note: WalkNote): string {
  const reason = note.reason;

  if (reason.because === 'refused') return `refused with ${String(reason.status)}`;

  return reason.because === 'stream-error'
    ? `failed mid-stream with ${String(reason.status)}`
    : WHY_NOTHING_ANSWERED[reason.because];
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
 * What a walk that served nobody leaves behind for the drawer to explain the failure with.
 *
 * @summary It is the very account the caller's own refusal prints, so the row a person reads and the
 * answer their client holds name the same children in the same words. A walk that touched nothing
 * under no router leaves nothing rather than an empty reading, because a reading nobody took must
 * never pose as one that found nothing wrong.
 */
export function diagnosisTheWalkLeaves(
  routing: EngineRouting,
  notes: readonly WalkNote[],
  router: string | undefined,
): FailureDiagnosis | undefined {
  const tried = attemptsRecorded(routing, notes);

  if (router === undefined && tried.length === 0) return undefined;

  return {
    ...(router === undefined ? {} : { router }),
    ...(tried.length === 0 ? {} : { tried }),
  };
}

const CARRIED_NO_REQUEST = {
  cooling: true,
  'off-branch': true,
} as const satisfies Record<OffBranchReason['because'] | 'cooling', true>;

/**
 * The notes standing for a request that actually left the machine.
 *
 * @summary A cooling child is named in the refusal and left out of traffic, because a cable paints
 * what the last request came to and a child never tried carried no request to come to anything. A
 * child standing off a branch is left out for the same reason, and more plainly: nothing ever asked
 * it, so a red cable over it would blame a target that did nothing wrong, whether a judgment sent
 * the request elsewhere or no judgment placed it at all.
 */
export function notesThatCarriedARequest(notes: readonly WalkNote[]): readonly WalkNote[] {
  return notes.filter((note) => !Object.hasOwn(CARRIED_NO_REQUEST, note.reason.because));
}

/**
 * What one failed attempt paints on its own cable.
 *
 * @summary The status is the provider's own where one came back, and the unreachable status where
 * none did, so a cable never claims a code no one answered with.
 */
export function failedOutcome(note: WalkNote, at: number): FailedOutcome {
  return { outcome: 'failed', at, status: statusOf(note), detail: `The child ${whyOf(note)}.` };
}

/**
 * Whether nothing ever answered for one child, which is what decides who owes it a row.
 *
 * @summary A child a provider refused already stands as the row the attempt that reached it raised,
 * so a second row would count one try twice. A child nothing answered for reached no provider at all,
 * and the gateway raises its row instead.
 */
export function nothingAnsweredFor(note: WalkNote): boolean {
  return note.reason.because !== 'refused' && note.reason.because !== 'stream-error';
}
