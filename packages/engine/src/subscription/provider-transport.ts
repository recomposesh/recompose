import type { AccountTransportPolicy, SubscriptionProviderId } from '@recompose/contracts';
import type { WreqInit } from 'node-wreq';

import { fetch as wreqFetch } from 'node-wreq';

import type { ProviderRequest } from './claude-request';
import type { RefreshFetch } from './refresh';

import { unwrapAntigravityResponse } from './antigravity-response';
import { decodeClaudeResponse } from './claude-compression';
import { restoreClaudeToolResponse } from './claude-tool-response';
import {
  CLAUDE_CIPHERS,
  CLAUDE_OAUTH_TLS_FINGERPRINT,
  CLAUDE_SIGNATURES,
  CLAUDE_TLS_FINGERPRINT,
} from './claude-transport-fingerprint';
import { subscriptionBounds } from './transport-bounds';

export { CLAUDE_OAUTH_TLS_FINGERPRINT, CLAUDE_TLS_FINGERPRINT };

const CLAUDE_OAUTH_HANDSHAKE_TIMEOUT_MS = 10_000;

function proxyOptions(policy: AccountTransportPolicy | undefined): Pick<WreqInit, 'proxy'> {
  if (policy?.mode === 'direct') return { proxy: false };
  if (policy?.mode === 'proxy') return { proxy: policy.url };

  return {};
}

export function subscriptionTransportOptions(
  provider: SubscriptionProviderId,
  policy?: AccountTransportPolicy,
): WreqInit {
  if (provider === 'openai') {
    return {
      browser: { mode: 'fixed', profile: 'chrome_149', platform: 'macos' },
      disableDefaultHeaders: true,
      ...proxyOptions(policy),
    };
  }

  if (provider === 'antigravity') {
    return { http1Only: true, disableDefaultHeaders: true, ...proxyOptions(policy) };
  }

  return {
    http1Only: true,
    disableDefaultHeaders: true,
    ...proxyOptions(policy),
    tlsSessionCacheCapacity: 32,
    tlsOptions: {
      alpnProtocols: ['HTTP1'],
      minTlsVersion: 'TLS1.2',
      maxTlsVersion: 'TLS1.3',
      curvesList: 'X25519:P-256:P-384',
      cipherList: CLAUDE_CIPHERS,
      sigalgsList: CLAUDE_SIGNATURES,
      keyShares: ['X25519'],
      sessionTicket: true,
      preSharedKey: true,
      pskDheKe: true,
      enableOcspStapling: true,
      enableSignedCertTimestamps: true,
      extensionPermutation: [...CLAUDE_TLS_FINGERPRINT.extensionTypes],
      preserveTls13CipherList: true,
    },
  };
}

export type WireResponse = {
  status: number;
  statusText?: string;
  headers: Headers | Iterable<[string, string]>;
  body: ReadableStream<Uint8Array> | null;
};

export type SubscriptionWireFetch = (url: string, init: WreqInit) => Promise<WireResponse>;

async function decodedProviderResponse(
  provider: SubscriptionProviderId,
  response: Response,
): Promise<Response> {
  if (provider === 'anthropic') {
    return decodeClaudeResponse(response);
  }

  return provider === 'antigravity' ? unwrapAntigravityResponse(response) : response;
}

async function restoredProviderResponse(
  provider: SubscriptionProviderId,
  request: ProviderRequest,
  response: Response,
): Promise<Response> {
  return provider === 'anthropic' && request.reverseToolNames !== undefined
    ? restoreClaudeToolResponse(response, request.reverseToolNames)
    : response;
}

export function webResponseFrom(upstream: WireResponse): Response {
  const headers = new Headers();

  for (const [name, value] of upstream.headers) {
    headers.append(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    ...(upstream.statusText === undefined ? {} : { statusText: upstream.statusText }),
    headers,
  });
}

function requestOptions(
  provider: SubscriptionProviderId,
  request: ProviderRequest,
  policy?: AccountTransportPolicy,
): WreqInit {
  return {
    ...subscriptionTransportOptions(provider, policy),
    ...subscriptionBounds,
    method: 'POST',
    headers: request.headers,
    body: request.body,
    retry: 0,
    throwHttpErrors: false,
  };
}

function antigravityFallbackUrl(url: string): string | null {
  const parsed = new URL(url);

  if (parsed.hostname !== 'daily-cloudcode-pa.googleapis.com') {
    return null;
  }

  parsed.hostname = 'cloudcode-pa.googleapis.com';

  return parsed.toString();
}

async function antigravityWireResponse(
  request: ProviderRequest,
  fetchLike: SubscriptionWireFetch,
): Promise<WireResponse> {
  const options = requestOptions('antigravity', request);
  const fallback = antigravityFallbackUrl(request.url);

  try {
    const first = await fetchLike(request.url, options);

    return first.status === 429 && fallback !== null ? await fetchLike(fallback, options) : first;
  } catch (failure) {
    if (fallback === null) throw failure;

    return fetchLike(fallback, options);
  }
}

async function providerWireResponse(
  provider: SubscriptionProviderId,
  request: ProviderRequest,
  fetchLike: SubscriptionWireFetch,
  policy?: AccountTransportPolicy,
): Promise<WireResponse> {
  const response =
    provider === 'antigravity'
      ? await antigravityWireResponse(request, fetchLike)
      : await fetchLike(request.url, requestOptions(provider, request, policy));

  return response;
}

export async function sendSubscriptionRequest(
  provider: SubscriptionProviderId,
  request: ProviderRequest,
  fetchLike: SubscriptionWireFetch = wreqFetch,
  policy?: AccountTransportPolicy,
): Promise<Response> {
  const upstream = await providerWireResponse(provider, request, fetchLike, policy);

  const decoded = await decodedProviderResponse(provider, webResponseFrom(upstream));

  return restoredProviderResponse(provider, request, decoded);
}

function isHostWithin(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function isClaudeOAuthUrl(url: string): boolean {
  const { hostname } = new URL(url);

  return isHostWithin(hostname, 'claude.com') || isHostWithin(hostname, 'anthropic.com');
}

export function subscriptionRefreshTransportOptions(
  url: string,
  policy?: AccountTransportPolicy,
): WreqInit {
  if (!isClaudeOAuthUrl(url)) {
    return subscriptionTransportOptions('openai', policy);
  }

  return {
    http1Only: true,
    disableDefaultHeaders: true,
    ...proxyOptions(policy),
    connectTimeout: CLAUDE_OAUTH_HANDSHAKE_TIMEOUT_MS,
    tlsSessionCacheCapacity: 8,
    tlsOptions: {
      minTlsVersion: 'TLS1.2',
      maxTlsVersion: 'TLS1.3',
      curvesList: 'X25519:P-256:P-384',
      cipherList: CLAUDE_CIPHERS,
      sigalgsList: CLAUDE_SIGNATURES,
      keyShares: ['X25519'],
      sessionTicket: true,
      preSharedKey: true,
      pskDheKe: true,
      extensionPermutation: [...CLAUDE_OAUTH_TLS_FINGERPRINT.extensionTypes],
      preserveTls13CipherList: true,
    },
  };
}

export const subscriptionRefreshFetch: RefreshFetch = async (url, init, policy) => {
  const response = await wreqFetch(url, {
    ...subscriptionRefreshTransportOptions(url, policy),
    ...init,
    retry: 0,
    throwHttpErrors: false,
  });

  const webResponse = webResponseFrom(response);

  return isClaudeOAuthUrl(url) ? decodeClaudeResponse(webResponse) : webResponse;
};
