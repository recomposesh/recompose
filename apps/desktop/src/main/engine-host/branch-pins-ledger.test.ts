import type { BranchPinTally, GatewayBranchPins } from '@recompose/contracts';

import { afterEach, describe, expect, test, vi } from 'vitest';

import { openBranchPinDesk } from './branch-pins-ledger';
import { TRAFFIC_PUSH_MS } from './traffic-ledger';

const LADDER = 'ladder';

function counted(
  slug: string,
  virtualModel: string,
  pinned: BranchPinTally,
  routeNode = LADDER,
): unknown {
  return { kind: 'branch-pins', slug, virtualModel, routeNode, pinned };
}

function aDesk() {
  const pushed: GatewayBranchPins[] = [];

  return {
    pushed,
    desk: openBranchPinDesk((pinning) => {
      pushed.push(pinning);
    }),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('what the windows learn about the branches a router holds', () => {
  test('a tally reaches the windows under its gateway, its model, and its router', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(counted('personal', 'fast', { coder: 2 }));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([{ personal: { fast: { [LADDER]: { coder: 2 } } } }]);
  });

  test('a tally replaces the one before it whole, so an emptied branch stops counting', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(counted('personal', 'fast', { coder: 2, talker: 1 }));
    desk.hears(counted('personal', 'fast', { coder: 2 }));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({ personal: { fast: { [LADDER]: { coder: 2 } } } });
  });

  test('two routers under one model each keep their own counts', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(counted('personal', 'fast', { coder: 1 }));
    desk.hears(counted('personal', 'fast', { writer: 3 }, 'deeper'));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({
      personal: { fast: { [LADDER]: { coder: 1 }, deeper: { writer: 3 } } },
    });
  });

  test('a run of tallies inside one frame costs the windows one word', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(counted('personal', 'fast', { coder: 1 }));
    desk.hears(counted('personal', 'fast', { coder: 2 }));
    desk.hears(counted('personal', 'fast', { coder: 3 }));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toHaveLength(1);
  });

  test('a message that is not a tally is left for another desk to read', () => {
    const { desk } = aDesk();

    expect(desk.hears({ kind: 'traffic', slug: 'personal' })).toBe(false);
    expect(desk.hears(counted('personal', 'fast', { coder: 1 }))).toBe(true);
  });
});

describe('what the windows learn when a gateway stops holding anything', () => {
  test('a gateway that stopped counts nothing, because its engine forgot every pin', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(counted('personal', 'fast', { coder: 2 }));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);
    desk.forget('personal');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({});
  });

  test('one gateway stopping leaves the counts of the one beside it alone', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.hears(counted('personal', 'fast', { coder: 2 }));
    desk.hears(counted('work', 'fast', { talker: 1 }));
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);
    desk.forget('personal');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed.at(-1)).toEqual({ work: { fast: { [LADDER]: { talker: 1 } } } });
  });

  test('forgetting a gateway nothing counted tells the windows nothing', async () => {
    vi.useFakeTimers();
    const { pushed, desk } = aDesk();

    desk.forget('personal');
    await vi.advanceTimersByTimeAsync(TRAFFIC_PUSH_MS);

    expect(pushed).toEqual([]);
  });
});
