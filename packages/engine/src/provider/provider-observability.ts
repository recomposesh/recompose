import type {
  ProviderObservation,
  ProviderObservationRequest,
  ProviderRequestLog,
} from './provider-observation';
import type { ProviderUsage } from './provider-usage';
import type { AttemptInFlight } from './telemetry-feed';

import { planUsageTheProviderReports } from './plan-usage-headers';
import { publishPlanUsage } from './plan-usage-watch';
import { quoteTheAnswerAllows } from './provider-error-quote';
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

  /**
   * Watches one answer's body go past, and settles the span whichever way the body ends.
   *
   * @summary A body nobody reads is not a body that never ended. A walk that refuses one child and
   * moves to the next drops the answer it refused, and a span settled only on a drained body would
   * leave that attempt standing open: the row it opened reads as in flight for as long as the app
   * runs, and the cable painting it never stops. So the abandoned body settles the span too, with
   * whatever went past before it was dropped.
   */
  public observe(response: Response): Response {
    const upstreamRequestIdHash = requestIdHash(
      firstHeader(response.headers, upstreamRequestIdHeaders),
    );

    this.sayWhatThePlanReads(response.headers);

    if (response.body === null) {
      this.finish(response.status, upstreamRequestIdHash, 0, emptyProviderUsage());

      return response;
    }

    this.attempt.answered(response.status);

    const decoder = new TextDecoder();
    const text: string[] = [];
    let ttft = 0;
    let settled = false;
    const settle = (): void => {
      if (settled) return;

      settled = true;
      const answered = text.join('');

      this.finish(
        response.status,
        upstreamRequestIdHash,
        ttft,
        providerUsageFrom(this.request.dialect, answered),
        answered,
      );
    };
    const observed = response.body.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform: (chunk, controller) => {
          if (ttft === 0) ttft = this.owner.now() - this.startedAt;
          text.push(decoder.decode(chunk, { stream: true }));
          controller.enqueue(chunk);
        },
        flush: () => {
          text.push(decoder.decode());
          settle();
        },
        cancel: settle,
      }),
    );

    return new Response(observed, response);
  }

  /**
   * Settles one span for a call that never came back with a response at all.
   *
   * @summary Every other way out of a span reads an answer, so a send that threw would leave the row
   * open and a person watching would read a request still in flight minutes after it died. The row
   * carries no usage and no time to first token, because nothing ever arrived to measure.
   */
  public failed(status: number): void {
    this.finish(status, undefined, 0, emptyProviderUsage());
  }

  public complete(
    status: number,
    headers: Headers,
    body: Uint8Array,
    ttftMs = this.owner.now() - this.startedAt,
  ): void {
    this.sayWhatThePlanReads(headers);
    const answered = new TextDecoder().decode(body);

    this.finish(
      status,
      requestIdHash(firstHeader(headers, upstreamRequestIdHeaders)),
      ttftMs,
      providerUsageFrom(this.request.dialect, answered),
      answered,
    );
  }

  /**
   * Says what the vendor behind this answer reported about the plan the account is spending.
   *
   * @summary A call spending a key belongs to no account, and a vendor that reported nothing leaves
   * the reading empty rather than reading as unspent, so both stay silent: a plan nobody measured
   * and a plan measured at zero must never draw the same meter.
   */
  private sayWhatThePlanReads(headers: Headers): void {
    const { accountId, provider } = this.request;

    if (accountId === undefined) return;

    const readAt = this.owner.wallClock();
    const windows = planUsageTheProviderReports(headers, readAt);

    if (windows.length === 0) return;

    publishPlanUsage({ accountId, provider, readAt, windows });
  }

  private finish(
    status: number,
    upstreamRequestIdHash: string | undefined,
    ttftMs: number,
    usage: ProviderUsage,
    answered = '',
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
    this.attempt.answered(
      status,
      { durationMs, tokens: usage.totalTokens, usage },
      quoteTheAnswerAllows(status, answered),
    );
  }
}

const sharedObservability = new ProviderObservability();

export function providerObservability(): ProviderObservability {
  return sharedObservability;
}
