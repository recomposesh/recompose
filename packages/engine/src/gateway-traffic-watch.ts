import type { RequestOutcome } from '@recompose/contracts';

import type { SpendGrantFor } from './gateway-spend';
import type { ServingTurn } from './provider/serving-turn';
import type { RouteNodeAddress } from './routing/route-node-key';

import { afterResponseBody, outcomeOf } from './answered-outcome';
import { onServingTurnAbort, servingTurn } from './provider/serving-turn';

export type NoteTraffic = (
  slug: string,
  virtualModel: string,
  routeNode: string,
  request: RequestOutcome,
) => void;

export type NoteAttempt = (routeNode: string, request: RequestOutcome) => void;

export type ServeWatched = (
  serve: (spendGrantFor: SpendGrantFor, noteAttempt: NoteAttempt) => Promise<Response>,
) => Promise<Response>;

const CLIENT_DISCONNECTED_STATUS = 499;

const CLIENT_DISCONNECTED_DETAIL = 'The client disconnected before the request finished.';

type Watching = {
  turn: ServingTurn | undefined;
  asked: RouteNodeAddress[];
  flowing: boolean;
  interrupted: boolean;
  stopListening: () => void;
  note: NoteTraffic;
  now: () => number;
  raiseFailure: (turn: ServingTurn | undefined, status: number, at: number) => void;
};

function watchForDisconnect(watching: Watching, address: RouteNodeAddress): void {
  const turn = watching.turn;

  if (turn === undefined) return;

  watching.stopListening = onServingTurnAbort(turn, () => {
    watching.interrupted = true;
    watching.note(address.slug, address.virtualModel, address.routeNode, {
      outcome: 'failed',
      at: watching.now(),
      status: CLIENT_DISCONNECTED_STATUS,
      detail: CLIENT_DISCONNECTED_DETAIL,
    });
  });
}

function openedTheFlow(watching: Watching, address: RouteNodeAddress): void {
  if (watching.flowing) return;

  watching.flowing = true;
  watching.note(address.slug, address.virtualModel, address.routeNode, {
    outcome: 'live',
    at: watching.now(),
  });
  watchForDisconnect(watching, address);
}

function watchedGrants(watching: Watching, spendGrantFor: SpendGrantFor): SpendGrantFor {
  return async (slug, virtualModel, routeNode, context) => {
    const address: RouteNodeAddress = { slug, virtualModel, routeNode };

    watching.asked.push(address);
    openedTheFlow(watching, address);

    if (watching.turn !== undefined) watching.turn.virtualModel = virtualModel;

    return spendGrantFor(slug, virtualModel, routeNode, context);
  };
}

function watchedAttempts(watching: Watching): NoteAttempt {
  return (routeNode, request) => {
    const address = watching.asked.at(-1);

    if (address !== undefined)
      watching.note(address.slug, address.virtualModel, routeNode, request);
  };
}

function settleTheTurn(
  watching: Watching,
  spent: RouteNodeAddress | undefined,
  settled: RequestOutcome,
  status: number,
): void {
  watching.stopListening();

  if (watching.interrupted) return;

  const at = watching.now();

  if (spent !== undefined) {
    watching.note(spent.slug, spent.virtualModel, spent.routeNode, { ...settled, at });
  }

  watching.raiseFailure(watching.turn, status, at);
}

/**
 * Settles one finished answer against the child that carried it and against the turn as a whole.
 *
 * @summary A turn that spent no child paints no cable, because a cable says what the last request
 * through one child came to and no child carried this one. It still settles when the turn reached a
 * route table, so a request refused before any child could take it leaves the row a person needs.
 * A turn that never named a virtual model reached no table and settles nowhere.
 *
 * The answer is read before the body is handed on, and read unconditionally, because `outcomeOf`
 * already knows which statuses are worth reading and asking the question twice put the failing line
 * in two places.
 */
async function noteWhenTheBodyEnds(watching: Watching, answer: Response): Promise<Response> {
  const spent = watching.asked.at(-1);

  if (spent === undefined && watching.turn?.virtualModel === undefined) return answer;

  const settled = await outcomeOf(answer, 0);

  return afterResponseBody(answer, () => {
    settleTheTurn(watching, spent, settled, answer.status);
  });
}

/**
 * Wraps one serving turn so every child it spent on is noted against what that child came to.
 *
 * @summary The grant is the one place every serving path names the route node it is about to spend,
 * and it is handed out fresh per turn, so two requests in flight at once can never take each other's
 * note.
 * A walk that moved on reports the child it left behind through the attempt note, and the child that
 * answered resolves from the final answer, which is how one request paints two cables. A turn that
 * never asked for a grant reached no child at all and is noted nowhere.
 */
export function watchingEveryAttempt(
  spendGrantFor: SpendGrantFor,
  note: NoteTraffic,
  raiseFailure: Watching['raiseFailure'],
  now: () => number = Date.now,
): ServeWatched {
  return async (serve) => {
    const watching: Watching = {
      turn: servingTurn(),
      asked: [],
      flowing: false,
      interrupted: false,
      stopListening: () => undefined,
      note,
      now,
      raiseFailure,
    };

    return noteWhenTheBodyEnds(
      watching,
      await serve(watchedGrants(watching, spendGrantFor), watchedAttempts(watching)),
    );
  };
}
