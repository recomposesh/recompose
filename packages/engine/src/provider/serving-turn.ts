import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * The one serving turn a provider call belongs to, held for as long as that turn runs.
 *
 * @summary A provider call starts deep inside the serving path, where the gateway it answers for
 * and the client that asked are both out of reach. The turn carries them down rather than threading
 * them through every call site, and it opens once per request, so two requests in flight at once can
 * never take each other's facts. `reachedProvider` is what tells a failure the gateway raised apart
 * from one a provider answered, which is how one request stays one row.
 */
export type ServingTurn = {
  gateway: string;
  clientKey: string;
  method: string;
  virtualModel?: string | undefined;
  reachedProvider: boolean;
};

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

export function servedForTurn(turn: ServingTurn | undefined): ServedFor | undefined {
  if (turn === undefined) return undefined;

  return { gateway: turn.gateway, clientKey: turn.clientKey, virtualModel: turn.virtualModel };
}

const servingTurns = new AsyncLocalStorage<ServingTurn>();

export function withinServingTurn<Answer>(turn: ServingTurn, serve: () => Answer): Answer {
  return servingTurns.run(turn, serve);
}

export function servingTurn(): ServingTurn | undefined {
  return servingTurns.getStore();
}
