import type {
  ProviderObservation,
  ProviderObservationRequest,
  ProviderRequestLog,
} from './provider-observation';
import type { ProviderUsage } from './provider-usage';
import type { AttemptInFlight } from './telemetry-feed';

import {
  clonedMedia,
  clonedObservation,
  firstHeader,
  observationRequest,
  requestIdHash,
  upstreamRequestIdHeaders,
} from './provider-observation';
import { emptyProviderUsage, providerUsageFrom } from './provider-usage';
import { servingTurn } from './serving-turn';
import { attemptFor, tellingReaders } from './telemetry-feed';

export { providerRequestId } from './provider-observation';
export type { ProviderObservation, ProviderRequestLog } from './provider-observation';
export { providerUsageFrom } from './provider-usage';
export type { ProviderUsage } from './provider-usage';

type ObservabilityOptions = {
  now?: (() => number) | undefined;
  wallClock?: (() => number) | undefined;
  maxRecords?: number | undefined;
};
type ObservationListener = (record: ProviderObservation) => void;

export class ProviderObservability {
  private readonly records: ProviderObservation[] = [];
  private readonly listeners = new Set<ObservationListener>();
  private readonly options: ObservabilityOptions;

  public constructor(options: ObservabilityOptions = {}) {
    this.options = options;
  }

  public start(request: ProviderRequestLog): ProviderObservationSpan {
    const turn = servingTurn();

    return new ProviderObservationSpan(
      this,
      observationRequest(request, turn),
      this.now(),
      attemptFor(turn, request, () => this.wallClock()),
    );
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
    const safeRecord = clonedObservation({ ...record, at: this.wallClock() });

    this.records.push(safeRecord);
    const excess = this.records.length - (this.options.maxRecords ?? 10_000);

    if (excess > 0) this.records.splice(0, excess);

    tellingReaders(this.listeners, () => clonedObservation(safeRecord), 'observation');
  }

  public now(): number {
    return this.options.now?.() ?? performance.now();
  }

  public wallClock(): number {
    return this.options.wallClock?.() ?? Date.now();
  }
}

export class ProviderObservationSpan {
  private readonly owner: ProviderObservability;
  private readonly request: ProviderObservationRequest;
  private readonly startedAt: number;
  private readonly attempt: AttemptInFlight;

  public constructor(
    owner: ProviderObservability,
    request: ProviderObservationRequest,
    startedAt: number,
    attempt: AttemptInFlight,
  ) {
    this.owner = owner;
    this.request = request;
    this.startedAt = startedAt;
    this.attempt = attempt;
  }

  public observe(response: Response): Response {
    const upstreamRequestIdHash = requestIdHash(
      firstHeader(response.headers, upstreamRequestIdHeaders),
    );

    if (response.body === null) {
      this.finish(response.status, upstreamRequestIdHash, 0, emptyProviderUsage());

      return response;
    }

    this.attempt.answered(response.status);

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
    const durationMs = this.owner.now() - this.startedAt;

    this.owner.publish({
      ...this.request,
      upstreamRequestIdHash,
      startedAt: this.startedAt,
      durationMs,
      ttftMs,
      status,
      usage,
      generate: this.request.generate ?? true,
      media: clonedMedia(this.request.media),
    });
    this.attempt.answered(status, { durationMs, tokens: usage.totalTokens });
  }
}

const sharedObservability = new ProviderObservability();

export function providerObservability(): ProviderObservability {
  return sharedObservability;
}
