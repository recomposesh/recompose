import type { EngineGateway, GatewayTraffic } from '@recompose/contracts';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { TRAFFIC_PUSH_MS, openTrafficDesk } from './traffic-ledger';

const at = 1_754_600_000_000;

function servedThrough(slug: string, virtualModel: string, moment = at): unknown {
  return { kind: 'traffic', slug, virtualModel, request: { outcome: 'served', at: moment } };
}

function failedThrough(slug: string, virtualModel: string, status: number): unknown {
  return {
    kind: 'traffic',
    slug,
    virtualModel,
    request: { outcome: 'failed', at, status, detail: 'The target answered badly.' },
  };
}

function aGatewayServing(slug: string, ...ids: readonly string[]): EngineGateway {
  return {
    slug,
    displayName: slug,
    port: 8397,
    virtualModels: ids.map((id) => ({
      id,
      displayName: id,
      target: { standing: 'bound', providerModel: 'gpt-5-mini' },
    })),
  };
}

function aDesk() {
  const pushed: GatewayTraffic[] = [];

  return {
    pushed,
    desk: openTrafficDesk((traffic) => {
      pushed.push(traffic);
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('what the windows learn about traffic', () => {
  test('a finished request reaches the windows under its gateway and its model', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(servedThrough('personal', 'fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([{ personal: { fast: { outcome: 'served', at } } }]);
  });

  test('the latest word about a model replaces the one before it', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(servedThrough('personal', 'fast'));
    desk.hears(failedThrough('personal', 'fast', 429));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)?.['personal']?.['fast']).toMatchObject({ outcome: 'failed', status: 429 });
  });

  test('every gateway that has served stays in the snapshot', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(servedThrough('personal', 'fast'));
    desk.hears(servedThrough('work', 'deep'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(Object.keys(pushed.at(-1) ?? {})).toEqual(['personal', 'work']);
  });
});

describe('how often the windows hear about traffic', () => {
  test('a busy gateway reaches the windows once per interval rather than once per request', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    for (const moment of [1, 2, 3, 4, 5]) {
      desk.hears(servedThrough('personal', 'fast', at + moment));
    }

    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toHaveLength(1);
    expect(pushed.at(0)?.['personal']?.['fast']).toEqual({ outcome: 'served', at: at + 5 });
  });

  test('a request after the interval has passed reaches the windows on its own', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(servedThrough('personal', 'fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);
    desk.hears(servedThrough('personal', 'deep'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toHaveLength(2);
    expect(Object.keys(pushed.at(-1)?.['personal'] ?? {})).toEqual(['fast', 'deep']);
  });

  test('nothing reaches the windows before the interval is up', () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(servedThrough('personal', 'fast'));

    expect(pushed).toEqual([]);
  });
});

describe('what the desk refuses to hear', () => {
  test('a state report belongs to the lifecycle lane, so the desk lets it pass', () => {
    const { pushed, desk } = aDesk();

    expect(desk.hears({ kind: 'state', answers: 'd1', slug: 'personal', state: {} })).toBe(false);
    expect(pushed).toEqual([]);
  });

  test('a report the desk cannot read is not treated as traffic', () => {
    const { desk } = aDesk();

    expect(desk.hears({ kind: 'traffic', slug: 'personal' })).toBe(false);
  });

  test('a traffic report the desk read is taken off the lane', () => {
    const { desk } = aDesk();

    expect(desk.hears(servedThrough('personal', 'fast'))).toBe(true);
  });
});

describe('a gateway whose models changed', () => {
  test('a model that left the config leaves the snapshot with it', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(servedThrough('personal', 'fast'));
    desk.hears(servedThrough('personal', 'deep'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    desk.keepOnly(aGatewayServing('personal', 'fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({ personal: { fast: { outcome: 'served', at } } });
  });

  test('another gateway keeps every model of its own', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(servedThrough('personal', 'fast'));
    desk.hears(servedThrough('work', 'deep'));
    desk.keepOnly(aGatewayServing('personal'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({ personal: {}, work: { deep: { outcome: 'served', at } } });
  });

  test('a gateway nothing has flowed through yet says nothing to the windows', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.keepOnly(aGatewayServing('personal', 'fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([]);
  });

  test('a config still holding every model that served says nothing to the windows', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(servedThrough('personal', 'fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    desk.keepOnly(aGatewayServing('personal', 'fast', 'deep'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toHaveLength(1);
  });
});
