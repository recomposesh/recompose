import type { GatewayJudging } from '@recompose/contracts';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { openJudgingDesk } from './judging-ledger';
import { TRAFFIC_PUSH_MS } from './traffic-ledger';

const ROUTER = 'r1';

function waiting(slug: string, judging: number, routeNode = ROUTER): unknown {
  return { kind: 'judging', slug, virtualModel: 'fast', routeNode, judging };
}

function aDesk() {
  const pushed: GatewayJudging[] = [];

  return {
    pushed,
    desk: openJudgingDesk((judging) => {
      pushed.push(judging);
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('what the windows learn about a router waiting on its judge', () => {
  test('a router that began judging reaches the windows under its gateway, model, and node', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(waiting('personal', 1));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([{ personal: { fast: { [ROUTER]: 1 } } }]);
  });

  test('a router that settled reaches the windows as waiting on nothing', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(waiting('personal', 1));
    desk.hears(waiting('personal', 0));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({ personal: { fast: { [ROUTER]: 0 } } });
  });

  test('a message of another shape is left for the desk it belongs to', () => {
    const { desk } = aDesk();

    expect(desk.hears({ kind: 'cooldown', slug: 'personal' })).toBe(false);
  });

  test('a gateway that stopped is dropped whole, so no tie is left pulsing for a dead child', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(waiting('personal', 1));
    desk.forget('personal');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({});
  });
});
