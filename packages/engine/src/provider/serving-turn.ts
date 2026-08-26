import type { FailureDiagnosis } from '@recompose/contracts';

import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The one serving turn a provider call belongs to, held for as long as that turn runs.
 *
 * @summary A provider call starts deep inside the serving path, where the gateway it answers for
 * and the client that asked are both out of reach. The turn carries them down rather than threading
 * them through every call site, and it opens once per request, so two requests in flight at once can
 * never take each other's facts. `rowPublished` is what tells a failure the gateway raised apart
 * from one an upstream attempt already stands for, which is how one request stays one row. It turns
 * on when a row is actually told to a reader, never when a call merely began, because a call that
 * began and never answered is exactly the failure the gateway has to raise a row for itself.
 *
 * `refusedWith` holds the sentence the gateway wrote for this turn, so the row a person reads carries
 * the words the caller was actually given rather than a second sentence written from the status. Only
 * refusals the gateway composed itself are ever remembered here, which is what keeps a provider's own
 * words out of that sentence while still letting them ride a cable.
 *
 * `diagnosis` holds the reading behind that sentence: which router stood in the way and what each
 * child it reached did. It rides the turn for the same reason the sentence does, because the walk
 * that knows it has already handed its answer back by the time the turn settles into a row.
 */
export type ServingTurn = {
  gateway: string;
  clientKey: string;
  method: string;
  virtualModel?: string | undefined;
  rowPublished: boolean;
  refusedWith?: string | undefined;
  diagnosis?: FailureDiagnosis | undefined;
  aborted?: boolean | undefined;
  abortListeners?: Set<() => void> | undefined;
};

/** Marks the downstream client as gone and wakes every in-flight observer exactly once. */
export function abortServingTurn(turn: ServingTurn): void {
  if (turn.aborted === true) {
    return;
  }

  turn.aborted = true;

  for (const listener of turn.abortListeners ?? []) {
    listener();
  }

  turn.abortListeners?.clear();
}

/** Runs a callback when the downstream client leaves before the serving turn finishes. */
export function onServingTurnAbort(turn: ServingTurn, listener: () => void): () => void {
  if (turn.aborted === true) {
    listener();

    return () => undefined;
  }

  const listeners = turn.abortListeners ?? new Set<() => void>();

  turn.abortListeners = listeners;
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Who one provider call was served for, kept on the observation it produced.
 *
 * @summary A gateway and a client key travel together or not at all: a provider call outside any
 * serving turn has neither, and one inside a turn has both. Keeping them as one absent-or-whole
 * fact is what lets a reader ask once whether the call belonged to a gateway.
 */
export type ServedFor = {
  gateway: string;
  clientKey: string;
  virtualModel?: string | undefined;
};

export function servedFor(turn: ServingTurn): ServedFor {
  return { gateway: turn.gateway, clientKey: turn.clientKey, virtualModel: turn.virtualModel };
}

export function servedForTurn(turn: ServingTurn | undefined): ServedFor | undefined {
  return turn === undefined ? undefined : servedFor(turn);
}

const servingTurns = new AsyncLocalStorage<ServingTurn>();

export function withinServingTurn<Answer>(turn: ServingTurn, serve: () => Answer): Answer {
  return servingTurns.run(turn, serve);
}

export function servingTurn(): ServingTurn | undefined {
  return servingTurns.getStore();
}

/**
 * Names the virtual model whose route table this turn is about to walk.
 *
 * @summary Naming it is also what tells a request refused before any child could carry it apart from
 * one that never resolved a model at all. The first is a gateway fault a person can fix and owes a
 * row; the second named something that does not exist, and owes none because no model ever stood for
 * it.
 */
export function servingTurnWalks(virtualModel: string): void {
  const turn = servingTurns.getStore();

  if (turn !== undefined) turn.virtualModel = virtualModel;
}

/**
 * Remembers the sentence the gateway itself refused this turn with.
 *
 * @summary The last one stands, because a walk writes a refusal for every child it could not use and
 * only the one written last reaches the caller.
 */
export function gatewayRefusedWith(sentence: string): void {
  const turn = servingTurns.getStore();

  if (turn !== undefined) turn.refusedWith = sentence;
}

/**
 * Remembers what the gateway read behind the refusal it wrote for this turn.
 *
 * @summary A reading that found nothing clears the one before it rather than leaving it standing,
 * because a turn that walked twice must never explain its second failure with the first walk's
 * children.
 */
export function gatewayDiagnosed(diagnosis: FailureDiagnosis | undefined): void {
  const turn = servingTurns.getStore();

  if (turn !== undefined) turn.diagnosis = diagnosis;
}
