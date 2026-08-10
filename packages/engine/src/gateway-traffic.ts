import type { LogRow, RequestOutcome } from '@recompose/contracts';
import type { MiddlewareHandler } from 'hono';

import { createHash } from 'node:crypto';

import type { SpendGrantFor } from './gateway-proxy';
import type { ProviderObservation } from './provider/provider-observability';
import type { ServingTurn } from './provider/serving-turn';

import { providerObservability } from './provider/provider-observability';
import { servingTurn, withinServingTurn } from './provider/serving-turn';

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
  return `sha256:${createHash('sha256').update(`${address}|${clientApp}`).digest('hex')}`;
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
        reachedProvider: false,
      },
      next,
    );
}

const rowListeners = new Set<LogRowListener>();

function observedRow(observation: ProviderObservation): LogRow | null {
  const { servedFor, status } = observation;

  if (servedFor === undefined) return null;

  return {
    id: crypto.randomUUID(),
    at: observation.at,
    gateway: servedFor.gateway,
    virtualModel: servedFor.virtualModel,
    origin: 'provider',
    method: observation.method,
    provider: observation.provider,
    accountId: observation.accountId,
    providerModel: observation.model,
    status,
    tokens: observation.usage.totalTokens,
    clientKey: servedFor.clientKey,
    ...(failed(status) ? { failure: detailFor(status) } : { durationMs: observation.durationMs }),
  };
}

function raisedRow(turn: ServingTurn, status: number): LogRow {
  return {
    id: crypto.randomUUID(),
    at: Date.now(),
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
 * raised before any provider answered rides the same feed, so the errors a footer counts and a
 * cable that reads red can never disagree.
 */
export function subscribeToLogRows(listener: LogRowListener): () => void {
  const forgetObservations = providerObservability().subscribe((observation) => {
    const row = observedRow(observation);

    if (row !== null) listener(row);
  });

  rowListeners.add(listener);

  return () => {
    forgetObservations();
    rowListeners.delete(listener);
  };
}

function publishRow(row: LogRow): void {
  for (const listener of rowListeners) listener(row);
}

export function noteUnreadableRequest(): void {
  const turn = servingTurn();

  if (turn !== undefined) publishRow(raisedRow(turn, UNREADABLE_REQUEST_STATUS));
}

function noteRaisedFailure(turn: ServingTurn | undefined, status: number): void {
  if (turn === undefined || turn.reachedProvider || !failed(status)) return;

  publishRow(raisedRow(turn, status));
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
      note(spent.slug, spent.virtualModel, await outcomeOf(answer, now()));
      noteRaisedFailure(turn, answer.status);
    }

    return answer;
  };
}
