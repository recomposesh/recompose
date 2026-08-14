import type { RequestOutcome } from '@recompose/contracts';

import type { SpendGrantFor } from './gateway-spend';
import type { ServingTurn } from './provider/serving-turn';

import { afterResponseBody, FIRST_FAILING_STATUS, outcomeOf } from './answered-outcome';
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

type Seat = { slug: string; virtualModel: string; routeNode: string };

type Watching = {
  turn: ServingTurn | undefined;
  asked: Seat[];
  flowing: boolean;
  interrupted: boolean;
  stopListening: () => void;
  note: NoteTraffic;
  now: () => number;
  raiseFailure: (turn: ServingTurn | undefined, status: number, at: number) => void;
};

function watchForDisconnect(watching: Watching, seat: Seat): void {
  const turn = watching.turn;

  if (turn === undefined) return;

  watching.stopListening = onServingTurnAbort(turn, () => {
    watching.interrupted = true;
    watching.note(seat.slug, seat.virtualModel, seat.routeNode, {
      outcome: 'failed',
      at: watching.now(),
      status: CLIENT_DISCONNECTED_STATUS,
      detail: CLIENT_DISCONNECTED_DETAIL,
    });
  });
}

function openedTheFlow(watching: Watching, seat: Seat): void {
  if (watching.flowing) return;

  watching.flowing = true;
  watching.note(seat.slug, seat.virtualModel, seat.routeNode, {
    outcome: 'live',
    at: watching.now(),
  });
  watchForDisconnect(watching, seat);
}

function watchedGrants(watching: Watching, spendGrantFor: SpendGrantFor): SpendGrantFor {
  return async (slug, virtualModel, routeNode, context) => {
    const seat: Seat = { slug, virtualModel, routeNode };

    watching.asked.push(seat);
    openedTheFlow(watching, seat);

    if (watching.turn !== undefined) watching.turn.virtualModel = virtualModel;

    return spendGrantFor(slug, virtualModel, routeNode, context);
  };
}

function watchedAttempts(watching: Watching): NoteAttempt {
  return (routeNode, request) => {
    const seat = watching.asked.at(-1);

    if (seat !== undefined) watching.note(seat.slug, seat.virtualModel, routeNode, request);
  };
}

async function noteWhenTheBodyEnds(watching: Watching, answer: Response): Promise<Response> {
  const spent = watching.asked.at(-1);

  if (spent === undefined) return answer;

  const preparedFailure =
    answer.status < FIRST_FAILING_STATUS ? undefined : await outcomeOf(answer, 0);

  return afterResponseBody(answer, () => {
    watching.stopListening();

    if (watching.interrupted) return;

    const at = watching.now();
    const outcome: RequestOutcome =
      preparedFailure === undefined ? { outcome: 'served', at } : { ...preparedFailure, at };

    watching.note(spent.slug, spent.virtualModel, spent.routeNode, outcome);
    watching.raiseFailure(watching.turn, answer.status, at);
  });
}

/**
 * Wraps one serving turn so every child it spent on is noted against what that child came to.
 *
 * @summary The grant is the one place every serving path names the seat it is about to spend, and it
 * is handed out fresh per turn, so two requests in flight at once can never take each other's note.
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
