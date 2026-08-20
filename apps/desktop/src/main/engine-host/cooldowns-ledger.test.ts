import type { GatewayCooldowns } from '@recompose/contracts';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { openCooldownDesk } from './cooldowns-ledger';
import { TRAFFIC_PUSH_MS } from './traffic-ledger';

const JUDGE = 'j1';

const LIFTS_AT = 1_700_000_060_000;

function cooled(slug: string, coolUntilMs: number, routeNode = JUDGE): unknown {
  return { kind: 'cooldown', slug, virtualModel: 'fast', routeNode, coolUntilMs };
}

function aDesk() {
  const pushed: GatewayCooldowns[] = [];

  return {
    pushed,
    desk: openCooldownDesk((cooling) => {
      pushed.push(cooling);
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('what the windows learn about a node standing down', () => {
  test('a stand-down reaches the windows under its gateway, its model, and its node', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(cooled('personal', LIFTS_AT));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([{ personal: { fast: { [JUDGE]: LIFTS_AT } } }]);
  });

  test('a node cooled again replaces the moment it stood down under before', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(cooled('personal', LIFTS_AT));
    desk.hears(cooled('personal', LIFTS_AT + 30_000));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({ personal: { fast: { [JUDGE]: LIFTS_AT + 30_000 } } });
  });

  test('two nodes under one model each stand back up on their own clock', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(cooled('personal', LIFTS_AT));
    desk.hears(cooled('personal', LIFTS_AT + 90_000, 'c1'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({
      personal: { fast: { [JUDGE]: LIFTS_AT, c1: LIFTS_AT + 90_000 } },
    });
  });

  test('a run of stand-downs inside one frame costs the windows one word', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(cooled('personal', LIFTS_AT));
    desk.hears(cooled('personal', LIFTS_AT + 1000));
    desk.hears(cooled('personal', LIFTS_AT + 2000));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toHaveLength(1);
  });

  test('a message that is not a stand-down is left for another desk to read', () => {
    const { desk } = aDesk();

    expect(desk.hears({ kind: 'traffic', slug: 'personal' })).toBe(false);
    expect(desk.hears(cooled('personal', LIFTS_AT))).toBe(true);
  });
});

describe('what the windows learn when a gateway stops', () => {
  test('a gateway that stopped stands nothing down, because its engine forgot every window', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(cooled('personal', LIFTS_AT));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);
    desk.forget('personal');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({});
  });

  test('one gateway stopping leaves the node standing down beside it alone', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(cooled('personal', LIFTS_AT));
    desk.hears(cooled('work', LIFTS_AT + 5000));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);
    desk.forget('personal');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({ work: { fast: { [JUDGE]: LIFTS_AT + 5000 } } });
  });

  test('forgetting a gateway nothing stood down under tells the windows nothing', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.forget('personal');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([]);
  });
});
