import { describe, expect, test } from 'vitest';

import { accrued, emptyUsageLedger } from './usage-buckets';
import { served } from './usage-buckets.testkit';

describe('the bucket long-context traffic accrues into', () => {
  const aLongPrompt = { input: 300_000, output: 200, cacheRead: 0, cacheWrite: 0, reasoning: 0 };

  const aShortPrompt = { input: 900, output: 200, cacheRead: 0, cacheWrite: 0, reasoning: 0 };

  test('a request whose prompt rose above a threshold accrues under that threshold', () => {
    const ledger = accrued(
      emptyUsageLedger(),
      served('long', { usage: aLongPrompt }),
      'api-key',
      272_000,
    );

    expect(ledger.buckets.at(0)?.tuple.contextOverTokens).toBe(272_000);
  });

  test('a request that stayed under every threshold accrues under none', () => {
    const ledger = accrued(emptyUsageLedger(), served('short', { usage: aShortPrompt }), 'api-key');

    expect(ledger.buckets.at(0)?.tuple.contextOverTokens).toBeUndefined();
  });

  test('one hour holding both kinds keeps them apart, because they are charged apart', () => {
    const short = accrued(emptyUsageLedger(), served('short', { usage: aShortPrompt }), 'api-key');
    const both = accrued(short, served('long', { usage: aLongPrompt }), 'api-key', 272_000);

    expect(both.buckets).toHaveLength(2);
    expect(both.buckets.map((bucket) => bucket.tuple.contextOverTokens)).toEqual([
      undefined,
      272_000,
    ]);
  });

  test('two long requests in one hour still fold into the one bucket they share', () => {
    const first = accrued(
      emptyUsageLedger(),
      served('long-one', { usage: aLongPrompt }),
      'api-key',
      272_000,
    );
    const second = accrued(first, served('long-two', { usage: aLongPrompt }), 'api-key', 272_000);

    expect(second.buckets).toHaveLength(1);
    expect(second.buckets.at(0)?.measures.requests).toBe(2);
  });
});
