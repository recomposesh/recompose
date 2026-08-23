import type { PlanUsageReading } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { ProviderRequestLog } from './provider-observability';

import { subscribeToPlanUsage } from './plan-usage-watch';
import { ProviderObservability } from './provider-observability';

const ACCOUNT = 'anthropic-personal';

const READ_AT = 1_700_000_000_000;

const RESETS_AT = 1_700_000_060_000;

const FIVE_HOURS_AT_42_PERCENT: PlanUsageReading = {
  accountId: ACCOUNT,
  provider: 'anthropic',
  readAt: READ_AT,
  windows: [{ length: '5h', spentShare: 0.42, resetsAt: RESETS_AT }],
};

function aVendorReportingItsPlan(): Headers {
  return new Headers({
    'anthropic-ratelimit-unified-5h-utilization': '0.42',
    'anthropic-ratelimit-unified-5h-reset': '1700000060',
  });
}

function aVendorSayingNothingAboutItsPlan(): Headers {
  return new Headers({ 'content-type': 'application/json' });
}

function readingsHeard(): { heard: PlanUsageReading[]; letGo: () => void } {
  const heard: PlanUsageReading[] = [];

  return {
    heard,
    letGo: subscribeToPlanUsage((reading) => {
      heard.push(reading);
    }),
  };
}

function aSubscriptionCall(overrides: Partial<ProviderRequestLog> = {}): ProviderRequestLog {
  return {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    accountId: ACCOUNT,
    dialect: 'anthropic',
    method: 'POST',
    ...overrides,
  };
}

function aSpanFor(request: ProviderRequestLog) {
  return new ProviderObservability({ wallClock: () => READ_AT }).start(request);
}

describe('what an answer says about the plan behind the account it was served on', () => {
  test('an answer carrying the vendor reading names the account and the provider it read for', async () => {
    const { heard, letGo } = readingsHeard();

    await aSpanFor(aSubscriptionCall())
      .observe(new Response('{}', { headers: aVendorReportingItsPlan() }))
      .text();
    letGo();

    expect(heard).toEqual([FIVE_HOURS_AT_42_PERCENT]);
  });

  test('an answer that came back with no body at all still says what the plan reads', () => {
    const { heard, letGo } = readingsHeard();

    aSpanFor(aSubscriptionCall()).observe(
      new Response(null, { status: 204, headers: aVendorReportingItsPlan() }),
    );
    letGo();

    expect(heard).toEqual([FIVE_HOURS_AT_42_PERCENT]);
  });

  test('a vendor that reported no plan at all says nothing, rather than a plan reading as unspent', async () => {
    const { heard, letGo } = readingsHeard();

    await aSpanFor(aSubscriptionCall())
      .observe(new Response('{}', { headers: aVendorSayingNothingAboutItsPlan() }))
      .text();
    letGo();

    expect(heard).toEqual([]);
  });

  test('a call spending a key rather than an account says nothing, since no account owns the plan', async () => {
    const { heard, letGo } = readingsHeard();

    await aSpanFor(aSubscriptionCall({ accountId: undefined }))
      .observe(new Response('{}', { headers: aVendorReportingItsPlan() }))
      .text();
    letGo();

    expect(heard).toEqual([]);
  });

  test('an answer gathered whole rather than streamed reads the plan the same way', () => {
    const { heard, letGo } = readingsHeard();

    aSpanFor(aSubscriptionCall()).complete(200, aVendorReportingItsPlan(), new Uint8Array());
    letGo();

    expect(heard).toEqual([FIVE_HOURS_AT_42_PERCENT]);
  });

  test('a gathered answer from a vendor that reported no plan says nothing either', () => {
    const { heard, letGo } = readingsHeard();

    aSpanFor(aSubscriptionCall()).complete(
      200,
      aVendorSayingNothingAboutItsPlan(),
      new Uint8Array(),
    );
    letGo();

    expect(heard).toEqual([]);
  });
});
