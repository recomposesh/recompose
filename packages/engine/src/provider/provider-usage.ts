import type { ProviderDialect } from '../gateway-wire';
import type { NamedCounts, ProviderUsage } from './provider-usage-counts';

import { parsedJson } from '../gateway-wire';
import { countOf, namedCountsFor, summedCounts } from './provider-usage-counts';

export type { ProviderUsage } from './provider-usage-counts';
export { emptyProviderUsage } from './provider-usage-counts';

function namedAnything(counts: NamedCounts): boolean {
  return Object.values(counts).some((count) => count > 0);
}

/**
 * The counts standing after one more event, which never erases what that event stayed silent about.
 *
 * @summary Anthropic states the input it read and the cache it hit as the message opens, and the
 * output it wrote as it closes, so a stream that kept only the last event counted its output alone.
 * An event whose every count reads zero is passed over rather than folded, because a stream that
 * closes on an empty usage envelope means it carried no reading rather than a turn that spent
 * nothing.
 */
function foldedCounts(standing: NamedCounts, arriving: NamedCounts): NamedCounts {
  return namedAnything(arriving) ? { ...standing, ...arriving } : standing;
}

function readingOf(dialect: ProviderDialect, counts: NamedCounts): ProviderUsage {
  return {
    inputTokens: countOf(counts, 'inputTokens'),
    outputTokens: countOf(counts, 'outputTokens'),
    totalTokens: counts.totalTokens ?? summedCounts(dialect, counts),
    cacheReadTokens: countOf(counts, 'cacheReadTokens'),
    cacheWriteTokens: countOf(counts, 'cacheWriteTokens'),
    reasoningTokens: countOf(counts, 'reasoningTokens'),
  };
}

function streamedCounts(dialect: ProviderDialect, text: string): NamedCounts {
  return text.split('\n').reduce<NamedCounts>((counts, line) => {
    if (!line.startsWith('data:')) return counts;

    return foldedCounts(counts, namedCountsFor(dialect, parsedJson(line.slice(5).trim())));
  }, {});
}

export function providerUsageFrom(dialect: ProviderDialect, text: string): ProviderUsage {
  const whole = parsedJson(text);

  if (whole !== undefined) {
    return readingOf(dialect, namedCountsFor(dialect, whole));
  }

  return readingOf(dialect, streamedCounts(dialect, text));
}
