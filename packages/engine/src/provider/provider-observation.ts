import { createHash } from 'node:crypto';

import type { ProviderDialect } from '../gateway-wire';
import type { ProviderMediaLog } from './provider-log-types';
import type { ProviderUsage } from './provider-usage';
import type { ServedFor, ServingTurn } from './serving-turn';

import { servedForTurn } from './serving-turn';

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

export type ProviderObservationRequest = Omit<ProviderRequestLog, 'requestId'> & {
  requestIdHash?: string | undefined;
  servedFor?: ServedFor | undefined;
};

const outboundRequestIdHeaders = ['x-request-id', 'x-client-request-id', 'x-cpa-trace-id'] as const;

export const upstreamRequestIdHeaders = [
  'x-upstream-request-id',
  'x-request-id',
  'request-id',
  'openai-request-id',
  'x-goog-request-id',
  'x-amzn-requestid',
] as const;

export function firstHeader(headers: Headers, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = headers.get(name)?.trim();

    if (value !== undefined && value !== '') return value;
  }

  return undefined;
}

export function providerRequestId(headers: Headers): string | undefined {
  return firstHeader(headers, outboundRequestIdHeaders);
}

/**
 * The one form every digest this engine shows a reader takes.
 *
 * @summary A request identifier and a client key both stand in for something a reader must never
 * see, and both are checked against the same `sha256:` shape at the contract boundary, so they are
 * written in one place rather than spelled out wherever a digest is needed.
 */
export function sha256Digest(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

export function requestIdHash(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (normalized === undefined || normalized === '') return undefined;

  return sha256Digest(normalized);
}

export function clonedMedia(media: ProviderMediaLog | undefined): ProviderMediaLog | undefined {
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

/**
 * The head of an observation, holding only the fields a reader is allowed to see.
 *
 * @summary Every field is named rather than spread, because a caller hands this whole objects that
 * carry credentials and bodies. Naming the fields is the allowlist: anything a call site adds stays
 * behind, and the serving turn it belonged to rides along so the row can name its gateway.
 */
export function observationRequest(
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

export function clonedObservation(record: ProviderObservation): ProviderObservation {
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
