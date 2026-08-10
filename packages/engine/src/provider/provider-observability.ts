import { createHash } from 'node:crypto';

import type { ProviderDialect } from '../gateway-wire';
import type { ProviderMediaLog } from './provider-log-types';
import type { ProviderUsage } from './provider-usage';
import type { ServedFor, ServingTurn } from './serving-turn';

import { emptyProviderUsage, providerUsageFrom } from './provider-usage';
import { servedForTurn, servingTurn } from './serving-turn';

export { providerUsageFrom } from './provider-usage';
export type { ProviderUsage } from './provider-usage';

export type ProviderRequestLog = {
  provider: string;
  model: string;
  accountId?: string | undefined;
  dialect: ProviderDialect;
  method: string;
  requestId?: string | undefined;
  generate?: boolean | undefined;
  version?: string | undefined;
  media?: ProviderMediaLog | undefined;
};

export type ProviderObservation = {
  provider: string;
  model: string;
  accountId?: string | undefined;
  dialect: ProviderDialect;
  method: string;
  requestIdHash?: string | undefined;
  upstreamRequestIdHash?: string | undefined;
  at: number;
  startedAt: number;
  durationMs: number;
  ttftMs: number;
  status: number;
  usage: ProviderUsage;
  generate: boolean;
  version?: string | undefined;
  media?: ProviderMediaLog | undefined;
  servedFor?: ServedFor | undefined;
};

type ProviderObservationRequest = Omit<ProviderRequestLog, 'requestId'> & {
  requestIdHash?: string | undefined;
  servedFor?: ServedFor | undefined;
};

type ObservabilityOptions = {
  now?: (() => number) | undefined;
  maxRecords?: number | undefined;
};
type ObservationListener = (record: ProviderObservation) => void;

const outboundRequestIdHeaders = ['x-request-id', 'x-client-request-id', 'x-cpa-trace-id'] as const;
const upstreamRequestIdHeaders = [
  'x-upstream-request-id',
  'x-request-id',
  'request-id',
  'openai-request-id',
  'x-goog-request-id',
  'x-amzn-requestid',
] as const;

function firstHeader(headers: Headers, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = headers.get(name)?.trim();

    if (value !== undefined && value !== '') return value;
  }

  return undefined;
}

export function providerRequestId(headers: Headers): string | undefined {
  return firstHeader(headers, outboundRequestIdHeaders);
}

function requestIdHash(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (normalized === undefined || normalized === '') return undefined;

  return `sha256:${createHash('sha256').update(normalized).digest('hex')}`;
}

function clonedMedia(media: ProviderMediaLog | undefined): ProviderMediaLog | undefined {
  if (media === undefined) return undefined;

  return {
    connection: media.connection,
    proxyScheme: media.proxyScheme,
    remoteTransport: media.remoteTransport,
    sessionId: media.sessionId,
    callId: media.callId,
    peer: media.peer,
    state: media.state,
  };
}

function observationRequest(
  request: ProviderRequestLog,
  turn: ServingTurn | undefined,
): ProviderObservationRequest {
  return {
    provider: request.provider,
    model: request.model,
    accountId: request.accountId,
    dialect: request.dialect,
    method: request.method,
    requestIdHash: requestIdHash(request.requestId),
    generate: request.generate,
    version: request.version,
    media: clonedMedia(request.media),
    servedFor: servedForTurn(turn),
  };
}

function clonedObservation(record: ProviderObservation): ProviderObservation {
  return {
    provider: record.provider,
    model: record.model,
    accountId: record.accountId,
    dialect: record.dialect,
    method: record.method,
    requestIdHash: record.requestIdHash,
    upstreamRequestIdHash: record.upstreamRequestIdHash,
    at: record.at,
    startedAt: record.startedAt,
    durationMs: record.durationMs,
    ttftMs: record.ttftMs,
    status: record.status,
    usage: { ...record.usage },
    generate: record.generate,
    version: record.version,
    media: clonedMedia(record.media),
    servedFor: record.servedFor === undefined ? undefined : { ...record.servedFor },
  };
}

export class ProviderObservability {
  private readonly records: ProviderObservation[] = [];
  private readonly listeners = new Set<ObservationListener>();
  private readonly options: ObservabilityOptions;

  public constructor(options: ObservabilityOptions = {}) {
    this.options = options;
  }

  public start(request: ProviderRequestLog): ProviderObservationSpan {
    const turn = servingTurn();

    if (turn !== undefined) turn.reachedProvider = true;

    return new ProviderObservationSpan(this, observationRequest(request, turn), this.now());
  }

  public snapshot(): ProviderObservation[] {
    return this.records.map(clonedObservation);
  }

  public popOldest(count: number): ProviderObservation[] {
    if (!Number.isInteger(count) || count <= 0) throw new RangeError('count must be positive');

    return this.records.splice(0, count);
  }

  public clear(): void {
    this.records.splice(0);
  }

  public subscribe(listener: ObservationListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public publish(record: Omit<ProviderObservation, 'at'>): void {
    const safeRecord = clonedObservation({ ...record, at: Date.now() });

    this.records.push(safeRecord);
    const excess = this.records.length - (this.options.maxRecords ?? 10_000);

    if (excess > 0) this.records.splice(0, excess);

    for (const listener of this.listeners) listener(clonedObservation(safeRecord));
  }

  public now(): number {
    return this.options.now?.() ?? performance.now();
  }
}

export class ProviderObservationSpan {
  private readonly owner: ProviderObservability;
  private readonly request: ProviderObservationRequest;
  private readonly startedAt: number;

  public constructor(
    owner: ProviderObservability,
    request: ProviderObservationRequest,
    startedAt: number,
  ) {
    this.owner = owner;
    this.request = request;
    this.startedAt = startedAt;
  }

  public observe(response: Response): Response {
    const upstreamRequestIdHash = requestIdHash(
      firstHeader(response.headers, upstreamRequestIdHeaders),
    );

    if (response.body === null) {
      this.finish(response.status, upstreamRequestIdHash, 0, emptyProviderUsage());

      return response;
    }

    const decoder = new TextDecoder();
    const text: string[] = [];
    let ttft = 0;
    const observed = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform: (chunk, controller) => {
          if (ttft === 0) ttft = this.owner.now() - this.startedAt;
          text.push(decoder.decode(chunk, { stream: true }));
          controller.enqueue(chunk);
        },
        flush: () => {
          text.push(decoder.decode());
          this.finish(
            response.status,
            upstreamRequestIdHash,
            ttft,
            providerUsageFrom(this.request.dialect, text.join('')),
          );
        },
      }),
    );

    return new Response(observed, response);
  }

  public complete(
    status: number,
    headers: Headers,
    body: Uint8Array,
    ttftMs = this.owner.now() - this.startedAt,
  ): void {
    this.finish(
      status,
      requestIdHash(firstHeader(headers, upstreamRequestIdHeaders)),
      ttftMs,
      providerUsageFrom(this.request.dialect, new TextDecoder().decode(body)),
    );
  }

  private finish(
    status: number,
    upstreamRequestIdHash: string | undefined,
    ttftMs: number,
    usage: ProviderUsage,
  ): void {
    this.owner.publish({
      ...this.request,
      upstreamRequestIdHash,
      startedAt: this.startedAt,
      durationMs: this.owner.now() - this.startedAt,
      ttftMs,
      status,
      usage,
      generate: this.request.generate ?? true,
      media: clonedMedia(this.request.media),
    });
  }
}

const sharedObservability = new ProviderObservability();

export function providerObservability(): ProviderObservability {
  return sharedObservability;
}
