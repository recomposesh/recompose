import type { SpendGrant } from '@recompose/contracts';

/** A binding that resolved to something a classification can actually be spent against. */
export type Spendable = Extract<SpendGrant, { verdict: 'resolved' }>;

/** How one classification call ended: an answer still tied to its budget, or a silence. */
export type JudgeAnswer =
  | { answered: Response; bound: AbortSignal }
  | { silent: 'timeout' | 'unreachable' };

/**
 * What one classification call is worth writing down, which is never what it asked or answered.
 *
 * @summary A person watching a conditional router needs to see the judge working: which model was
 * asked, how it answered, and how long it took. None of the three is content. The tail stays out
 * because it is the caller's own words, and the label stays out because a row naming the branch
 * would put the classification itself in a log a person copies out of.
 */
export type JudgeNote = {
  provider: string;
  providerModel: string;
  accountId?: string | undefined;
  status: number;
  durationMs: number;
  failure?: string | undefined;
};

/**
 * The little a row needs of the ask that raised it, which is neither the branches nor the tail.
 *
 * @summary Narrower than the ask on purpose, so the row writer never reaches the caller's own words
 * and the whole ask can go on satisfying it structurally without either side importing the other.
 */
export type JudgeRowScene = {
  providerModel: string;
  noteJudged: (judged: JudgeNote) => void;
  now: () => number;
};

const JUDGE_SILENT_STATUS = 504;

const JUDGE_UNREACHABLE_STATUS = 502;

const SILENT_FAILURE = 'The judge did not answer inside its budget.';

const UNREACHABLE_FAILURE = 'The judge could not be reached.';

function accountThatPaid(grant: Spendable): string | undefined {
  return grant.spend.custody === 'open' ? undefined : grant.spend.accountId;
}

function providerThatAnswered(grant: Spendable): string {
  return grant.spend.custody === 'open' ? 'open' : grant.spend.provider;
}

function standingOfTheAnswer(answer: JudgeAnswer): { status: number; failure?: string } {
  if ('answered' in answer) return { status: answer.answered.status };

  return answer.silent === 'timeout'
    ? { status: JUDGE_SILENT_STATUS, failure: SILENT_FAILURE }
    : { status: JUDGE_UNREACHABLE_STATUS, failure: UNREACHABLE_FAILURE };
}

/**
 * The one row a classification call leaves behind, so judging is something a person can watch.
 *
 * @summary A silence gets a row too, spelled as the gateway's own timeout rather than a provider's,
 * because a judge that answered nothing is exactly the trouble a person opens the drawer to find and
 * a missing row reads as a judge that never ran. A binding nothing resolved never reaches here: no
 * call left the machine, and a row for it would claim one did.
 */
export function noteTheCallLeaves(
  scene: JudgeRowScene,
  grant: Spendable,
  answer: JudgeAnswer,
  startedAt: number,
): void {
  const standing = standingOfTheAnswer(answer);

  scene.noteJudged({
    provider: providerThatAnswered(grant),
    providerModel: scene.providerModel,
    accountId: accountThatPaid(grant),
    status: standing.status,
    durationMs: Math.max(0, scene.now() - startedAt),
    ...(standing.failure === undefined ? {} : { failure: standing.failure }),
  });
}
