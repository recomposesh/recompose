export const DEFAULT_COOLDOWN_MS = 60_000;

const DELAY_SECONDS = /^\d+$/u;

const RESET_WINDOW = /^anthropic-ratelimit-.+-reset$/u;

function instantTheDelayNames(value: string, now: number): number | undefined {
  if (DELAY_SECONDS.test(value)) return now + Number(value) * 1000;

  const named = Date.parse(value);

  return Number.isNaN(named) ? undefined : named;
}

function earliestReopening(headers: Headers): number | undefined {
  const reopenings: number[] = [];

  for (const [name, value] of headers) {
    if (!RESET_WINDOW.test(name)) continue;

    const reopening = Date.parse(value);

    if (!Number.isNaN(reopening)) reopenings.push(reopening);
  }

  return reopenings.length === 0 ? undefined : Math.min(...reopenings);
}

/**
 * The instant a provider itself names as the moment a refused child could serve again.
 *
 * @summary It reads `Retry-After` in both forms RFC 9110 allows, a delay in seconds and an HTTP
 * date, and falls back on the rate-limit reset windows a refusal reports beside it. The delay form
 * is tried first on purpose, because a bare number parses as a year rather than a span. Several
 * windows reporting at once answer the earliest, so a child stands down no longer than the soonest
 * evidence says it must. Nothing here re-reads a vendor body; the transport hands over what its own
 * normalizer already settled.
 */
export function coolUntilTheProviderNames(headers: Headers, now: number): number | undefined {
  return instantTheDelayNames(headers.get('retry-after') ?? '', now) ?? earliestReopening(headers);
}
