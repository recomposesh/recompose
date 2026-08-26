import type { CoolingSignal } from './cooldown-signal';

import { DEFAULT_COOLDOWN_MS } from './cooldown-signal';

export type AttemptReading<TAnswer> =
  | { kind: 'transport-failure' }
  | { kind: 'grant-missing-credential' }
  | { kind: 'grant-missing-target' }
  | {
      kind: 'refused';
      status: number;
      answer: TAnswer;
      retryableHint?: boolean;
      cooling?: CoolingSignal;
    }
  | {
      kind: 'stream-error-before-commit';
      equivalentStatus: number;
      answer: TAnswer;
      cooling?: CoolingSignal;
    }
  | { kind: 'served'; answer: TAnswer };

export type JudgeReading =
  | { heard: 'answer'; label: string }
  | { heard: 'refusal' }
  | { heard: 'timeout' };

/**
 * The two ways a judge this router actually called comes back having classified nothing.
 *
 * @summary Both leave the request unplaced, and they ask a person for different repairs, so they
 * travel apart from the first reading onward. A failed call covers everything the call could not
 * survive, a binding that resolves to no seat and a spent credential included, which is why it asks
 * about the binding rather than about the model's speed. A judge past its timeout answers too slowly
 * for the router that waited, and only the timeout moves.
 */
type JudgeTrouble = 'judge-call-failed' | 'judge-timed-out';

/**
 * Every way a conditional router reaches no verdict, including the two where it asks nobody.
 *
 * @summary The refusal a caller reads is written from this, so each arm is a distinct repair rather
 * than a distinct internal state: one sentence covering all four would tell a person their judge is
 * unreachable when the truth is that no call was ever made. The two the router settles alone stand
 * beside the two its judge answers with, because the person reading the refusal cannot tell from
 * outside which kind they hit.
 */
export type UnjudgedCause = JudgeTrouble | 'judge-standing-cooling' | 'unpinned-sealed-turn';

export type JudgeVerdict =
  | { verdict: 'answered'; label: string }
  | { verdict: 'no-verdict'; because: JudgeTrouble };

/**
 * The trouble each reading that classified nothing stands for, held to the readings by the compiler.
 *
 * @summary A reading added later fails the build here rather than shipping a refusal that names
 * somebody else's repair, which is the whole failure this table exists to prevent.
 */
const TROUBLE_ONE_READING_CARRIES = {
  refusal: 'judge-call-failed',
  timeout: 'judge-timed-out',
} as const satisfies Record<Exclude<JudgeReading['heard'], 'answer'>, JudgeTrouble>;

/**
 * The verdict one judge reading earns: a label the branches can read, or no verdict and why.
 *
 * @summary A refusal and a silence past the budget both leave the branches nothing to read, and
 * neither reaches the caller wearing the status the judge itself answered, but they part company on
 * what a person has to fix, so the verdict carries which one it was. An answer carrying no text
 * still crosses as an answer, because a judge that wrote nothing is one the branches can decide
 * about and ask again, while a judge that refused is one worth asking a second time for nothing.
 */
export function classifyJudge(reading: JudgeReading): JudgeVerdict {
  return reading.heard === 'answer'
    ? { verdict: 'answered', label: reading.label }
    : { verdict: 'no-verdict', because: TROUBLE_ONE_READING_CARRIES[reading.heard] };
}

export type AttemptReason =
  | { because: 'transport-failure' }
  | { because: 'missing-credential' }
  | { because: 'missing-target' }
  | { because: 'refused'; status: number }
  | { because: 'stream-error'; status: number };

type MovingOn = {
  verdict: 'move-on';
  coolUntilMs: number;
  retryAtMs?: number;
  reason: AttemptReason;
};

export type AttemptVerdict<TAnswer> = MovingOn | { verdict: 'answer'; answer: TAnswer };

type Refused<TAnswer> = Extract<AttemptReading<TAnswer>, { kind: 'refused' }>;

type StreamErrored<TAnswer> = Extract<
  AttemptReading<TAnswer>,
  { kind: 'stream-error-before-commit' }
>;

type Answering<TAnswer> = Extract<
  AttemptReading<TAnswer>,
  { kind: 'refused' | 'stream-error-before-commit' | 'served' }
>;

type Unanswered = Extract<
  AttemptReading<never>,
  { kind: 'transport-failure' | 'grant-missing-credential' | 'grant-missing-target' }
>;

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504, 529]);

/**
 * The stand-down one failed attempt earns, and whether a caller may be told to wait it out.
 *
 * @summary The two are told apart because a stand-down is this gateway's own guess at when to ask a
 * child again, while a wait handed to a caller is a promise the provider made. A refusal reporting
 * only a bucket's reopening times the guess and promises nothing, so it steers the walk without ever
 * becoming a `Retry-After` a client would obey. A pool downed by dead upstreams therefore reaches
 * the exhausted refusal carrying no wait at all, which is what makes it read as a fault rather than
 * a limit.
 */
function movingOn(
  reason: AttemptReason,
  cooling: CoolingSignal | undefined,
  now: number,
): MovingOn {
  if (cooling === undefined) {
    return { verdict: 'move-on', coolUntilMs: now + DEFAULT_COOLDOWN_MS, reason };
  }

  return cooling.promised
    ? {
        verdict: 'move-on',
        coolUntilMs: cooling.coolUntilMs,
        retryAtMs: cooling.coolUntilMs,
        reason,
      }
    : { verdict: 'move-on', coolUntilMs: cooling.coolUntilMs, reason };
}

function verdictARefusalEarns<TAnswer>(
  reading: Refused<TAnswer>,
  now: number,
): AttemptVerdict<TAnswer> {
  return (reading.retryableHint ?? RETRYABLE_STATUSES.has(reading.status))
    ? movingOn({ because: 'refused', status: reading.status }, reading.cooling, now)
    : { verdict: 'answer', answer: reading.answer };
}

function verdictAStreamErrorEarns<TAnswer>(
  reading: StreamErrored<TAnswer>,
  now: number,
): AttemptVerdict<TAnswer> {
  return RETRYABLE_STATUSES.has(reading.equivalentStatus)
    ? movingOn({ because: 'stream-error', status: reading.equivalentStatus }, reading.cooling, now)
    : { verdict: 'answer', answer: reading.answer };
}

function verdictAnAnsweringReadingEarns<TAnswer>(
  reading: Answering<TAnswer>,
  now: number,
): AttemptVerdict<TAnswer> {
  if (reading.kind === 'refused') return verdictARefusalEarns(reading, now);

  if (reading.kind === 'stream-error-before-commit') return verdictAStreamErrorEarns(reading, now);

  return { verdict: 'answer', answer: reading.answer };
}

function reasonAnUnansweredAttemptGives(reading: Unanswered): AttemptReason {
  if (reading.kind === 'transport-failure') return { because: 'transport-failure' };

  return reading.kind === 'grant-missing-target'
    ? { because: 'missing-target' }
    : { because: 'missing-credential' };
}

/**
 * The verdict one attempt reading earns: move the walk on to another child, or answer the caller.
 *
 * @summary This is the whole table, one row per reading, and the only place that decides whether a
 * failure another child could cure differs from one no child could. A transport failure carrying no
 * status builds its row before any status is consulted, so a silent skip past failover cannot exist
 * here. A reading carrying nothing to hand the caller cannot reach a status row at all, because the
 * split is on whether an answer came back rather than on what its status read. The compiler proves
 * each row covers its side of that split, so a reading added later earns a verdict or fails to
 * build. A hint the provider's own normalizer supplied outranks the status, because the normalizer
 * read the body and this table never does.
 */
export function classify<TAnswer>(
  reading: AttemptReading<TAnswer>,
  now: number,
): AttemptVerdict<TAnswer> {
  return 'answer' in reading
    ? verdictAnAnsweringReadingEarns(reading, now)
    : movingOn(reasonAnUnansweredAttemptGives(reading), undefined, now);
}
