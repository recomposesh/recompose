import type { LogRow, RequestOutcome } from '@recompose/contracts';
import type { MiddlewareHandler } from 'hono';

import type { SpendGrantFor } from './gateway-proxy';
import type { ServingTurn } from './provider/serving-turn';
import type { ProviderAttempt } from './provider/telemetry-feed';

import { sha256Digest } from './provider/provider-observation';
import { servingTurn, withinServingTurn } from './provider/serving-turn';
import { subscribeToProviderAttempts, tellingReaders } from './provider/telemetry-feed';

export type NoteTraffic = (slug: string, virtualModel: string, request: RequestOutcome) => void;

export type LogRowListener = (row: LogRow) => void;

export type ServeWatched = (
  serve: (spendGrantFor: SpendGrantFor) => Promise<Response>,
) => Promise<Response>;

const FIRST_FAILING_STATUS = 400;

const UNREADABLE_REQUEST_STATUS = 400;

const DETAIL_SPAN = 280;

const QUOTE_WAIT_MS = 1500;

/**
 * The sentence a red cable falls back to when the target answered without a word.
 *
 * @summary A failed answer that explains itself is quoted, because the person debugging a red
 * cable wants the target's own reason. A success is never read, since consuming a good stream
 * to take a note would cost the caller its answer.
 */
const detailByStatus = new Map<number, string>([
  [400, 'The gateway could not read the request.'],
  [401, 'The target refused the credential.'],
  [403, 'The target refused the credential.'],
  [404, 'The target serves no such model.'],
  [408, 'The target did not answer in time.'],
  [429, 'The target is turning requests away for now.'],
  [502, 'The gateway could not reach the target.'],
  [504, 'The target did not answer in time.'],
]);

function detailFor(status: number): string {
  return detailByStatus.get(status) ?? `The target answered ${String(status)}.`;
}

function failed(status: number): boolean {
  return status >= FIRST_FAILING_STATUS;
}

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

/**
 * Opens the serving turn every row a gateway writes is keyed and named by.
 *
 * @summary The key is a digest over the address the request came from and the client app it named,
 * taken here at the edge and nowhere else, because the renderer counts distinct callers apart while
 * the privacy rule forbids it ever reading one. Nothing downstream sees either ingredient again.
 */
export function openServingTurn(gateway: string): MiddlewareHandler {
  return async (c, next) =>
    withinServingTurn(
      {
        gateway,
        clientKey: clientKeyFor(clientAddressOf(c.env), c.req.header('user-agent') ?? ''),
        method: c.req.method,
        rowPublished: false,
      },
      next,
    );
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
    ...(failed(status) ? { failure: detailFor(status) } : { durationMs: attempt.durationMs }),
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

function wordOf(body: unknown): string | undefined {
  if (typeof body !== 'string') {
    return undefined;
  }

  const spoken = body.trim().slice(0, DETAIL_SPAN).trim();

  return spoken === '' ? undefined : spoken;
}

function spokenInside(body: object): string | undefined {
  const underError = 'error' in body ? spokenBy(body.error) : undefined;

  return underError ?? ('message' in body ? spokenBy(body.message) : undefined);
}

function spokenBy(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) {
    return wordOf(body);
  }

  return spokenInside(body);
}

async function quotedByTheTarget(answer: Response): Promise<string | undefined> {
  if (!(answer.headers.get('content-type') ?? '').includes('json')) {
    return undefined;
  }

  try {
    return spokenBy(await answer.clone().json());
  } catch {
    return undefined;
  }
}

async function beforeTheAnswerGrowsStale<Read>(read: Promise<Read>, whenLate: Read): Promise<Read> {
  return Promise.race([
    read,
    new Promise<Read>((rest) => {
      setTimeout(() => {
        rest(whenLate);
      }, QUOTE_WAIT_MS);
    }),
  ]);
}

async function outcomeOf(answer: Response, at: number): Promise<RequestOutcome> {
  if (answer.status < FIRST_FAILING_STATUS) {
    return { outcome: 'served', at };
  }

  const quoted = await beforeTheAnswerGrowsStale(quotedByTheTarget(answer), undefined);

  return {
    outcome: 'failed',
    at,
    status: answer.status,
    detail: quoted ?? detailFor(answer.status),
  };
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
    const answer = await serve(async (slug, virtualModel, context) => {
      asked.push({ slug, virtualModel });

      if (turn !== undefined) turn.virtualModel = virtualModel;

      return spendGrantFor(slug, virtualModel, context);
    });
    const spent = asked.at(-1);

    if (spent !== undefined) {
      const at = now();

      note(spent.slug, spent.virtualModel, await outcomeOf(answer, at));
      noteRaisedFailure(turn, answer.status, at);
    }

    return answer;
  };
}
