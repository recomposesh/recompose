import type { EngineGateway, GatewayTraffic } from '@recompose/contracts';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { TRAFFIC_PUSH_MS, openTrafficDesk } from './traffic-ledger';

const at = 1_754_600_000_000;

const stoppedAt = at + 5_000;

function servedThrough(slug: string, virtualModel: string): unknown {
  return { kind: 'traffic', slug, virtualModel, request: { outcome: 'served', at } };
}

function liveThrough(slug: string, virtualModel: string): unknown {
  return { kind: 'traffic', slug, virtualModel, request: { outcome: 'live', at } };
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

describe('a gateway that stopped while a request was live', () => {
  test('the live request reads failed, naming the stop as the reason', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(liveThrough('personal', 'fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    vi.setSystemTime(stoppedAt);
    desk.interrupt('personal');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({
      personal: {
        fast: {
          outcome: 'failed',
          at: stoppedAt,
          status: 503,
          detail: 'The gateway stopped before the request finished.',
        },
      },
    });
  });

  test('a request that finished keeps the outcome it earned', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(servedThrough('personal', 'deep'));
    desk.hears(liveThrough('personal', 'fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    desk.interrupt('personal');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)?.['personal']?.['deep']).toEqual({ outcome: 'served', at });
    expect(pushed.at(-1)?.['personal']?.['fast']).toMatchObject({ outcome: 'failed' });
  });

  test('a gateway holding nothing live says nothing more when it stops', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(servedThrough('personal', 'fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    desk.interrupt('personal');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toHaveLength(1);
  });
});

describe('the traffic lane once a gateway has stopped', () => {
  test('a report after the stop is taken off the lane but moves nothing', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.interrupt('personal');

    expect(desk.hears(servedThrough('personal', 'fast'))).toBe(true);

    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([]);
  });

  test('a gateway starting again is heard like new', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.interrupt('personal');
    desk.keepOnly(aGatewayServing('personal', 'fast'));
    desk.hears(servedThrough('personal', 'fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({ personal: { fast: { outcome: 'served', at } } });
  });
});

describe('a gateway removed from the traffic snapshot', () => {
  test('its outcomes leave the snapshot with it', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(servedThrough('personal', 'fast'));
    desk.hears(servedThrough('work', 'deep'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    desk.forget('personal');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({ work: { deep: { outcome: 'served', at } } });
  });

  test('a gateway nothing flowed through leaves nothing behind', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.forget('ghost');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([]);
  });

  test('a removed gateway that returns is heard like new', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.interrupt('personal');
    desk.forget('personal');
    desk.hears(servedThrough('personal', 'fast'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({ personal: { fast: { outcome: 'served', at } } });
  });
});
