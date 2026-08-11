import type { LogRow, RequestOutcome } from '@recompose/contracts';
import type { MiddlewareHandler } from 'hono';

import type { SpendGrantFor } from './gateway-proxy';
import type { ServingTurn } from './provider/serving-turn';
import type { ProviderAttempt } from './provider/telemetry-feed';

import {
  afterResponseBody,
  detailFor,
  failed,
  FIRST_FAILING_STATUS,
  outcomeOf,
} from './answered-outcome';
import { sha256Digest } from './provider/provider-observation';
import {
  abortServingTurn,
  onServingTurnAbort,
  servingTurn,
  withinServingTurn,
} from './provider/serving-turn';
import { subscribeToProviderAttempts, tellingReaders } from './provider/telemetry-feed';

export type NoteTraffic = (slug: string, virtualModel: string, request: RequestOutcome) => void;

export type LogRowListener = (row: LogRow) => void;

export type ServeWatched = (
  serve: (spendGrantFor: SpendGrantFor) => Promise<Response>,
) => Promise<Response>;

const UNREADABLE_REQUEST_STATUS = 400;

const CLIENT_DISCONNECTED_STATUS = 499;

const CLIENT_DISCONNECTED_DETAIL = 'The client disconnected before the request finished.';

function fieldOf(holder: unknown, name: string): unknown {
  if (typeof holder !== 'object' || holder === null) return undefined;

  const field: unknown = Reflect.get(holder, name);

  return field;
}

function clientAddressOf(bindings: unknown): string {
  const address = fieldOf(fieldOf(fieldOf(bindings, 'incoming'), 'socket'), 'remoteAddress');

  return typeof address === 'string' ? address : '';
}

function clientKeyFor(address: string, clientApp: string): string {
  return sha256Digest(`${address}|${clientApp}`);
}

type NodeEventSource = { once: (event: string, listener: () => void) => void };

function listensOnce(value: unknown): value is NodeEventSource {
  return typeof fieldOf(value, 'once') === 'function';
}

function nodeEventSource(value: unknown): NodeEventSource | undefined {
  return listensOnce(value) ? value : undefined;
}

/**
 * Opens the serving turn every row a gateway writes is keyed and named by.
 *
 * @summary The key is a digest over the address the request came from and the client app it named,
 * taken here at the edge and nowhere else, because the renderer counts distinct callers apart while
 * the privacy rule forbids it ever reading one. Nothing downstream sees either ingredient again.
 */
export function openServingTurn(gateway: string): MiddlewareHandler {
  return async (c, next) => {
    const turn: ServingTurn = {
      gateway,
      clientKey: clientKeyFor(clientAddressOf(c.env), c.req.header('user-agent') ?? ''),
      method: c.req.method,
      rowPublished: false,
    };
    const incoming = nodeEventSource(fieldOf(c.env, 'incoming'));
    const outgoing = fieldOf(c.env, 'outgoing');

    incoming?.once('aborted', () => {
      abortServingTurn(turn);
    });
    nodeEventSource(outgoing)?.once('close', () => {
      if (fieldOf(outgoing, 'writableFinished') !== true) {
        abortServingTurn(turn);
      }
    });

    return withinServingTurn(turn, next);
  };
}

const rowListeners = new Set<LogRowListener>();

function named(value: string | undefined): string | undefined {
  const spoken = value?.trim();

  return spoken === '' ? undefined : spoken;
}

function attemptRow(attempt: ProviderAttempt): LogRow {
  const { servedFor, status } = attempt;

  return {
    id: attempt.id,
    at: attempt.at,
    gateway: servedFor.gateway,
    virtualModel: servedFor.virtualModel,
    origin: 'provider',
    method: attempt.method,
    provider: named(attempt.provider),
    accountId: named(attempt.accountId),
    providerModel: named(attempt.providerModel),
    status,
    tokens: attempt.tokens,
    clientKey: servedFor.clientKey,
    ...(failed(status)
      ? { failure: attempt.failure ?? detailFor(status), durationMs: attempt.durationMs }
      : { durationMs: attempt.durationMs }),
  };
}

function raisedRow(turn: ServingTurn, status: number, at: number): LogRow {
  return {
    id: crypto.randomUUID(),
    at,
    gateway: turn.gateway,
    virtualModel: turn.virtualModel,
    origin: 'gateway',
    method: turn.method,
    status,
    clientKey: turn.clientKey,
    failure: detailFor(status),
  };
}

/**
 * Hands every row one gateway writes to a reader, without taking a single one out of the buffer.
 *
 * @summary Management drains the observation buffer destructively through its usage queue, so a
 * feed that popped rows would take them from under it. This one only listens, and a row the gateway
 * raised before any attempt stood for the request rides the same feed, so the errors a footer counts
 * and a cable that reads red can never disagree.
 */
export function subscribeToLogRows(listener: LogRowListener): () => void {
  const forgetAttempts = subscribeToProviderAttempts((attempt) => {
    listener(attemptRow(attempt));
  });

  rowListeners.add(listener);

  return () => {
    forgetAttempts();
    rowListeners.delete(listener);
  };
}

function publishRow(row: LogRow): void {
  tellingReaders(rowListeners, () => row, 'log row');
}

export function noteUnreadableRequest(at: number = Date.now()): void {
  const turn = servingTurn();

  if (turn === undefined || turn.rowPublished) return;

  publishRow(raisedRow(turn, UNREADABLE_REQUEST_STATUS, at));
}

function noteRaisedFailure(turn: ServingTurn | undefined, status: number, at: number): void {
  if (turn === undefined || turn.rowPublished || !failed(status)) return;

  publishRow(raisedRow(turn, status, at));
}

type Asked = { slug: string; virtualModel: string };

/**
 * Wraps one serving turn so the virtual model it spent on is noted against the answer it gave.
 *
 * @summary The grant is the one place every serving path names its gateway and its virtual model,
 * and it is handed out fresh per turn, so two requests in flight at once can never take each
 * other's note. A turn that never asked for a grant never reached a virtual model, so it is noted
 * nowhere: an unknown model is a caller's mistake rather than a cable that went red.
 */
export function watchingTraffic(
  spendGrantFor: SpendGrantFor,
  note: NoteTraffic,
  now: () => number = Date.now,
): ServeWatched {
  return async (serve) => {
    const turn = servingTurn();
    const asked: Asked[] = [];
    let flowing = false;
    let interrupted = false;
    let stopListeningForDisconnect: () => void = () => undefined;
    const answer = await serve(async (slug, virtualModel, context) => {
      asked.push({ slug, virtualModel });

      if (!flowing) {
        flowing = true;
        note(slug, virtualModel, { outcome: 'live', at: now() });

        if (turn !== undefined) {
          stopListeningForDisconnect = onServingTurnAbort(turn, () => {
            interrupted = true;
            note(slug, virtualModel, {
              outcome: 'failed',
              at: now(),
              status: CLIENT_DISCONNECTED_STATUS,
              detail: CLIENT_DISCONNECTED_DETAIL,
            });
          });
        }
      }

      if (turn !== undefined) turn.virtualModel = virtualModel;

      return spendGrantFor(slug, virtualModel, context);
    });
    const spent = asked.at(-1);

    if (spent === undefined) {
      return answer;
    }

    const preparedFailure =
      answer.status < FIRST_FAILING_STATUS ? undefined : await outcomeOf(answer, 0);

    return afterResponseBody(answer, () => {
      stopListeningForDisconnect();

      if (interrupted) {
        return;
      }

      const at = now();
      const outcome: RequestOutcome =
        preparedFailure === undefined ? { outcome: 'served', at } : { ...preparedFailure, at };

      note(spent.slug, spent.virtualModel, outcome);
      noteRaisedFailure(turn, answer.status, at);
    });
  };
}
