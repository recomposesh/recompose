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
      coolUntilMs?: number;
    }
  | {
      kind: 'stream-error-before-commit';
      equivalentStatus: number;
      answer: TAnswer;
      coolUntilMs?: number;
    }
  | { kind: 'served'; answer: TAnswer };

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

function movingOn(reason: AttemptReason, promised: number | undefined, now: number): MovingOn {
  return promised === undefined
    ? { verdict: 'move-on', coolUntilMs: now + DEFAULT_COOLDOWN_MS, reason }
    : { verdict: 'move-on', coolUntilMs: promised, retryAtMs: promised, reason };
}

function verdictARefusalEarns<TAnswer>(
  reading: Refused<TAnswer>,
  now: number,
): AttemptVerdict<TAnswer> {
  return (reading.retryableHint ?? RETRYABLE_STATUSES.has(reading.status))
    ? movingOn({ because: 'refused', status: reading.status }, reading.coolUntilMs, now)
    : { verdict: 'answer', answer: reading.answer };
}

function verdictAStreamErrorEarns<TAnswer>(
  reading: StreamErrored<TAnswer>,
  now: number,
): AttemptVerdict<TAnswer> {
  return RETRYABLE_STATUSES.has(reading.equivalentStatus)
    ? movingOn(
        { because: 'stream-error', status: reading.equivalentStatus },
        reading.coolUntilMs,
        now,
      )
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
