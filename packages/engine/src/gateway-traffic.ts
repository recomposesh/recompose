import type { FailureDiagnosis, LogRow } from '@recompose/contracts';
import type { MiddlewareHandler } from 'hono';

import type { SpendGrantFor } from './gateway-spend';
import type { NoteTraffic, ServeWatched } from './gateway-traffic-watch';
import type { JudgeNote } from './provider/judge-call';
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

const JUDGE_ALIAS = 'judge';

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

/**
 * The reading a provider row carries, which is the provider's own sentence and nothing more.
 *
 * @summary A provider row already names the child it is about in its own cells, so it enumerates no
 * children: the ladder's account belongs to the row that stands for the whole turn. What only this
 * row can say is what the provider said, so that is all it says.
 */
function quotedOnTheRow(attempt: ProviderAttempt): Pick<LogRow, 'diagnosis'> {
  const upstreamMessage = attempt.upstreamMessage;

  return upstreamMessage === undefined ? {} : { diagnosis: { upstreamMessage } };
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
      ? {
          failure: attempt.failure ?? detailFor(status),
          durationMs: attempt.durationMs,
          ...quotedOnTheRow(attempt),
        }
      : { durationMs: attempt.durationMs }),
  };
}

type RaisedFailure = { status: number; at: number; failure: string; diagnosis?: FailureDiagnosis };

function raisedRow(turn: ServingTurn, raised: RaisedFailure): LogRow {
  return {
    id: crypto.randomUUID(),
    at: raised.at,
    gateway: turn.gateway,
    virtualModel: turn.virtualModel,
    origin: 'gateway',
    method: turn.method,
    status: raised.status,
    clientKey: turn.clientKey,
    failure: raised.failure,
    ...(raised.diagnosis === undefined ? {} : { diagnosis: raised.diagnosis }),
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

/**
 * Leaves the row for a request too broken to read, in the words the status alone earns.
 *
 * @summary The sentence stays the status reading rather than the refusal the caller was handed,
 * because that refusal names the JSON key the request itself repeated and a row carries nothing the
 * request said.
 */
export function noteUnreadableRequest(at: number = Date.now()): void {
  const turn = servingTurn();

  if (turn === undefined || turn.rowPublished) return;

  publishRow(
    raisedRow(turn, {
      status: UNREADABLE_REQUEST_STATUS,
      at,
      failure: detailFor(UNREADABLE_REQUEST_STATUS),
    }),
  );
}

/**
 * Leaves a row the gateway raised beside the turn rather than for the turn's own outcome.
 *
 * @summary Two callers reach here, and both speak for a moment no provider ever answered: a request
 * the edge turned away, and one child a walk could not place the request with. So the sentence is the
 * one the caller was given and the provider cells stay empty.
 *
 * It leaves `rowPublished` alone on purpose, because neither caller stands for how the turn ended. A
 * guard answers before any route is chosen, so no row can be standing yet. A ladder that tried three
 * children owes a person three rows, with the turn's own outcome still owed one on top.
 */
export function noteGatewayRow(raised: Omit<RaisedFailure, 'at'> & { at?: number }): void {
  const turn = servingTurn();

  if (turn === undefined) return;

  publishRow(raisedRow(turn, { ...raised, at: raised.at ?? Date.now() }));
}

/**
 * Leaves the row for one classification call, so judging is something a person can watch happen.
 *
 * @summary The row stands where the virtual model would, reading `judge` and then the model the
 * judge was asked on, because the drawer already prints that pair as a journey and a person scanning
 * the column sees judging without a column of its own. It is deliberately not an attempt: an attempt
 * paints a cable, and the judge carries no request for a cable to stand for. Leaving `rowPublished`
 * alone follows from the same thing, since the turn still owes a row for how it actually ended.
 */
export function noteJudgeRow(judged: JudgeNote, at: number = Date.now()): void {
  const turn = servingTurn();

  if (turn === undefined) return;

  publishRow({
    id: crypto.randomUUID(),
    at,
    gateway: turn.gateway,
    virtualModel: JUDGE_ALIAS,
    origin: 'provider',
    method: turn.method,
    provider: named(judged.provider),
    accountId: named(judged.accountId),
    providerModel: named(judged.providerModel),
    status: judged.status,
    durationMs: judged.durationMs,
    clientKey: turn.clientKey,
    ...(judged.failure === undefined ? {} : { failure: judged.failure }),
  });
}

function failureTheTurnRaises(turn: ServingTurn, status: number, at: number): RaisedFailure {
  return {
    status,
    at,
    failure: turn.refusedWith ?? detailFor(status),
    ...(turn.diagnosis === undefined ? {} : { diagnosis: turn.diagnosis }),
  };
}

function noteRaisedFailure(turn: ServingTurn | undefined, status: number, at: number): void {
  if (turn === undefined || turn.rowPublished || !failed(status)) return;

  publishRow(raisedRow(turn, failureTheTurnRaises(turn, status, at)));
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
