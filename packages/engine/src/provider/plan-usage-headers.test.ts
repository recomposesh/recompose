import { describe, expect, test } from 'vitest';

import { planUsageTheProviderReports } from './plan-usage-headers';

const NOW = 1_700_000_000_000;

const RESETS_AT_SECONDS = 1_700_013_200;

const RESETS_AT_MS = RESETS_AT_SECONDS * 1000;

function answeredWith(headers: Record<string, string>): Headers {
  return new Headers(headers);
}

describe('what Anthropic says about the plan behind an answer', () => {
  test('the five-hour window reads the share the vendor already spent, as a fraction', () => {
    const read = planUsageTheProviderReports(
      answeredWith({
        'anthropic-ratelimit-unified-5h-utilization': '0.07',
        'anthropic-ratelimit-unified-5h-reset': String(RESETS_AT_SECONDS),
      }),
      NOW,
    );

    expect(read).toEqual([{ length: '5h', spentShare: 0.07, resetsAt: RESETS_AT_MS }]);
  });

  test('the seven-day window folds into the weekly one every other reading uses', () => {
    const read = planUsageTheProviderReports(
      answeredWith({ 'anthropic-ratelimit-unified-7d-utilization': '0.41' }),
      NOW,
    );

    expect(read).toEqual([{ length: 'week', spentShare: 0.41 }]);
  });

  test('a reset the vendor stamped as a date crosses as the same instant', () => {
    const read = planUsageTheProviderReports(
      answeredWith({
        'anthropic-ratelimit-unified-5h-utilization': '0.5',
        'anthropic-ratelimit-unified-5h-reset': '2023-11-15T01:53:20.000Z',
      }),
      NOW,
    );

    expect(read).toEqual([{ length: '5h', spentShare: 0.5, resetsAt: RESETS_AT_MS }]);
  });

  test('a window past its whole reads as spent rather than as more than spent', () => {
    const read = planUsageTheProviderReports(
      answeredWith({ 'anthropic-ratelimit-unified-5h-utilization': '1.4' }),
      NOW,
    );

    expect(read).toEqual([{ length: '5h', spentShare: 1 }]);
  });

  test('a share the vendor wrote as nonsense is dropped rather than read as nothing spent', () => {
    const read = planUsageTheProviderReports(
      answeredWith({ 'anthropic-ratelimit-unified-5h-utilization': 'allowed' }),
      NOW,
    );

    expect(read).toEqual([]);
  });
});

describe('what Codex says about the plan behind an answer', () => {
  test('a window reads its share as the percentage the vendor sent, turned into a fraction', () => {
    const read = planUsageTheProviderReports(
      answeredWith({
        'x-codex-primary-used-percent': '23.5',
        'x-codex-primary-window-minutes': '300',
        'x-codex-primary-reset-at': String(RESETS_AT_SECONDS),
      }),
      NOW,
    );

    expect(read).toEqual([{ length: '5h', spentShare: 0.235, resetsAt: RESETS_AT_MS }]);
  });

  test('a window a day or longer is the weekly one, whatever the vendor calls its bucket', () => {
    const read = planUsageTheProviderReports(
      answeredWith({
        'x-codex-secondary-used-percent': '8',
        'x-codex-secondary-window-minutes': '10080',
      }),
      NOW,
    );

    expect(read).toEqual([{ length: 'week', spentShare: 0.08 }]);
  });

  test('a reset counted forward in seconds lands on the same instant as a stamped one', () => {
    const read = planUsageTheProviderReports(
      answeredWith({
        'x-codex-primary-used-percent': '10',
        'x-codex-primary-window-minutes': '300',
        'x-codex-primary-reset-after-seconds': '13200',
      }),
      NOW,
    );

    expect(read).toEqual([{ length: '5h', spentShare: 0.1, resetsAt: RESETS_AT_MS }]);
  });
});

describe('a Codex bucket this engine has never seen named', () => {
  test('a bucket the vendor named itself is read like every other, rather than by its prefix', () => {
    const read = planUsageTheProviderReports(
      answeredWith({
        'x-gpt-5-codex-primary-used-percent': '50',
        'x-gpt-5-codex-primary-window-minutes': '300',
      }),
      NOW,
    );

    expect(read).toEqual([{ length: '5h', spentShare: 0.5 }]);
  });
});

describe('an answer that says nothing about a plan', () => {
  test('a vendor reporting no plan at all leaves the reading empty', () => {
    expect(
      planUsageTheProviderReports(answeredWith({ 'content-type': 'text/event-stream' }), NOW),
    ).toEqual([]);
  });

  test('a rate-limit family that is not the unified one is left alone', () => {
    const read = planUsageTheProviderReports(
      answeredWith({
        'anthropic-ratelimit-tokens-remaining': '4000',
        'anthropic-ratelimit-tokens-limit': '8000',
      }),
      NOW,
    );

    expect(read).toEqual([]);
  });
});

describe('an answer captured from the vendor itself', () => {
  test('the unified family reads as the two windows the strip draws', () => {
    const read = planUsageTheProviderReports(
      answeredWith({
        'anthropic-ratelimit-unified-5h-reset': '1787485200',
        'anthropic-ratelimit-unified-5h-status': 'allowed',
        'anthropic-ratelimit-unified-5h-utilization': '0.19',
        'anthropic-ratelimit-unified-7d-reset': '1787745600',
        'anthropic-ratelimit-unified-7d-status': 'allowed',
        'anthropic-ratelimit-unified-7d-utilization': '0.12',
        'anthropic-ratelimit-unified-fallback-percentage': '0.5',
        'anthropic-ratelimit-unified-representative-claim': 'five_hour',
        'anthropic-ratelimit-unified-status': 'allowed',
      }),
      NOW,
    );

    expect(read).toEqual([
      { length: '5h', spentShare: 0.19, resetsAt: 1_787_485_200_000 },
      { length: 'week', spentShare: 0.12, resetsAt: 1_787_745_600_000 },
    ]);
  });

  test('a window scoped to one model is left alone, so it never overwrites the weekly one', () => {
    const read = planUsageTheProviderReports(
      answeredWith({
        'anthropic-ratelimit-unified-7d-utilization': '0.12',
        'anthropic-ratelimit-unified-7d_oi-utilization': '0.01',
      }),
      NOW,
    );

    expect(read).toEqual([{ length: 'week', spentShare: 0.12 }]);
  });
});

describe('a Codex answer captured from the vendor itself', () => {
  test('the two buckets read as the two windows, on their names alone', () => {
    const read = planUsageTheProviderReports(
      answeredWith({
        'x-codex-primary-used-percent': '1',
        'x-codex-secondary-used-percent': '0',
      }),
      NOW,
    );

    expect(read).toEqual([
      { length: '5h', spentShare: 0.01 },
      { length: 'week', spentShare: 0 },
    ]);
  });

  test('a length the vendor did send beats the one its bucket name implies', () => {
    const read = planUsageTheProviderReports(
      answeredWith({
        'x-codex-primary-used-percent': '4',
        'x-codex-primary-window-minutes': '10080',
      }),
      NOW,
    );

    expect(read).toEqual([{ length: 'week', spentShare: 0.04 }]);
  });

  test('a bucket named neither and measured by nothing is dropped, since nothing places it', () => {
    const read = planUsageTheProviderReports(
      answeredWith({ 'x-codex-tertiary-used-percent': '9' }),
      NOW,
    );

    expect(read).toEqual([]);
  });
});
