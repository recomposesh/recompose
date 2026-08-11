import type { ProviderRequestLog } from './provider-observation';
import type { ServedFor, ServingTurn } from './serving-turn';

import { onServingTurnAbort, servedFor } from './serving-turn';

/**
 * One upstream attempt, as the logs drawer lists it.
 *
 * @summary A retry is its own attempt under its own id, so a person reads each try rather than one
 * blurred outcome. An attempt commits the moment the gateway knows a status and repeats itself under
 * the same id once the body ends, which is why a row never depends on whether the caller drained the
 * answer: the first telling stands, and the second only adds what measuring the body revealed. Who
 * it was served for is read once, when the attempt opens, because a turn is free to ask for a second
 * grant and the two reports of one attempt must never disagree on the virtual model it reached.
 */
export type ProviderAttempt = {
  id: string;
  at: number;
  servedFor: ServedFor;
  provider: string;
  providerModel: string;
  accountId?: string | undefined;
  method: string;
  status: number;
  durationMs?: number | undefined;
  tokens?: number | undefined;
  failure?: string | undefined;
};

type AttemptMeasure = { durationMs: number; tokens: number };

export type AttemptInFlight = { answered: (status: number, measure?: AttemptMeasure) => void };

type AttemptReader = (attempt: ProviderAttempt) => void;

const attemptReaders = new Set<AttemptReader>();

type AttemptOpening = { id: string; at: number; servedFor: ServedFor; request: ProviderRequestLog };

function attemptRowOf(
  opening: AttemptOpening,
  status: number,
  measure?: AttemptMeasure,
  failure?: string,
): ProviderAttempt {
  return {
    id: opening.id,
    at: opening.at,
    servedFor: opening.servedFor,
    provider: opening.request.provider,
    providerModel: opening.request.model,
    accountId: opening.request.accountId,
    method: opening.request.method,
    status,
    ...measure,
    ...(failure === undefined ? {} : { failure }),
  };
}

/**
 * Hands one telemetry fact to every reader, and never lets a broken reader reach the serving path.
 *
 * @summary A reader that throws is that reader's own defect. Answering a request must not fail
 * because something watching it did, so the failure is written down against the fact it broke on and
 * every later reader still hears it.
 */
export function tellingReaders<Fact>(
  readers: Iterable<(fact: Fact) => void>,
  fact: () => Fact,
  named: string,
): void {
  for (const reader of readers) {
    try {
      reader(fact());
    } catch (failure) {
      console.error(`recompose could not hand a reader one ${named}.`, failure);
    }
  }
}

export function subscribeToProviderAttempts(reader: AttemptReader): () => void {
  attemptReaders.add(reader);

  return () => {
    attemptReaders.delete(reader);
  };
}

const tellsNobody: AttemptInFlight = { answered: () => undefined };

const CLIENT_DISCONNECTED_STATUS = 499;
const CLIENT_DISCONNECTED_FAILURE = 'The client disconnected before the request finished.';

/**
 * Opens the attempt a provider call will be listed as, or one that lists nothing.
 *
 * @summary A call outside a serving turn belongs to no gateway, and one naming no provider model
 * resolved no target, so neither is a request a person could read a row for. A plugin's own outbound
 * call is the second kind. Both still record their observation for the usage queue; they simply
 * raise no row, which is also what leaves the gateway free to raise its own when the request it was
 * serving failed without ever reaching a provider.
 */
export function attemptFor(
  turn: ServingTurn | undefined,
  request: ProviderRequestLog,
  wallClock: () => number,
): AttemptInFlight {
  if (turn === undefined || request.model.trim() === '') {
    return tellsNobody;
  }

  const opening: AttemptOpening = {
    id: crypto.randomUUID(),
    at: wallClock(),
    servedFor: servedFor(turn),
    request,
  };
  let finished = false;
  let interrupted = false;
  let stopListeningForDisconnect: () => void = () => undefined;

  const tell = (status: number, measure?: AttemptMeasure, failure?: string) => {
    turn.rowPublished = true;
    tellingReaders(
      attemptReaders,
      () => attemptRowOf(opening, status, measure, failure),
      'request row',
    );
  };

  stopListeningForDisconnect = onServingTurnAbort(turn, () => {
    if (finished || interrupted) {
      return;
    }

    interrupted = true;
    tell(
      CLIENT_DISCONNECTED_STATUS,
      { durationMs: Math.max(0, wallClock() - opening.at), tokens: 0 },
      CLIENT_DISCONNECTED_FAILURE,
    );
  });

  return {
    answered: (status, measure) => {
      if (interrupted) {
        return;
      }

      if (measure !== undefined) {
        finished = true;
        stopListeningForDisconnect();
      }

      tell(status, measure);
    },
  };
}
