import type { LogRow } from '@recompose/contracts';
import type { MiddlewareHandler } from 'hono';

import type { SpendGrantFor } from './gateway-spend';
import type { NoteTraffic, ServeWatched } from './gateway-traffic-watch';
import type { ServingTurn } from './provider/serving-turn';
import type { ProviderAttempt } from './provider/telemetry-feed';

import { detailFor, failed } from './answered-outcome';
import { watchingEveryAttempt } from './gateway-traffic-watch';
import { sha256Digest } from './provider/provider-observation';
import { abortServingTurn, servingTurn, withinServingTurn } from './provider/serving-turn';
import { subscribeToProviderAttempts, tellingReaders } from './provider/telemetry-feed';

export type { NoteTraffic, ServeWatched } from './gateway-traffic-watch';

export type LogRowListener = (row: LogRow) => void;

const UNREADABLE_REQUEST_STATUS = 400;

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

function measuredSplit(usage: ProviderAttempt['usage']): Pick<LogRow, 'usage'> {
  if (usage === undefined || usage.totalTokens === 0) {
    return {};
  }

  return {
    usage: {
      input: usage.inputTokens,
      output: usage.outputTokens,
      cacheRead: usage.cacheReadTokens,
      cacheWrite: usage.cacheWriteTokens,
      reasoning: usage.reasoningTokens,
    },
  };
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
    ...measuredSplit(attempt.usage),
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

/**
 * Wraps one serving turn so every child it spent on reaches the cables and the log alike.
 *
 * @summary The row a gateway raises for itself and the note a cable paints come from the same turn,
 * which is why the errors a footer counts and a cable that reads red can never disagree. The watching
 * itself lives beside this, and the raised row rides in from here, so neither has to know the other's
 * job.
 */
export function watchingTraffic(
  spendGrantFor: SpendGrantFor,
  note: NoteTraffic,
  now: () => number = Date.now,
): ServeWatched {
  return watchingEveryAttempt(spendGrantFor, note, noteRaisedFailure, now);
}
