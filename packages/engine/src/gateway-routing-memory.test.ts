import type { BranchPinTally } from '@recompose/contracts';

import { fc, test as propertyTest } from '@fast-check/vitest';
import { describe, expect, test } from 'vitest';

import type { TallyBranchPins } from './gateway-routing-memory';
import type { RouteNodeAddress } from './routing/route-node-key';

import {
  createBranchPins,
  PIN_IDLE_MS,
  PINNED_CONVERSATION_LIMIT,
  routingMemory,
} from './gateway-routing-memory';

const NOW = 1_700_000_000_000;

const LADDER: RouteNodeAddress = { slug: 'codex', virtualModel: 'fast', routeNode: 'ladder' };

const OTHER_LADDER: RouteNodeAddress = { ...LADDER, routeNode: 'deeper' };

function aClock(): { now: () => number; tick: (span: number) => void } {
  let at = NOW;

  return {
    now: () => at,
    tick: (span) => {
      at += span;
    },
  };
}

function conversation(rank: number): string {
  return `conversation-${String(rank)}`;
}

describe('the branch a conversation keeps', () => {
  test('a pinned conversation reads back the child its first request earned', () => {
    const pins = createBranchPins(() => NOW);

    pins.pin(LADDER, 'session-1', 'coder');

    expect(pins.pinnedAt(LADDER, 'session-1')).toBe('coder');
  });

  test('a conversation nobody pinned reads back nothing', () => {
    const pins = createBranchPins(() => NOW);

    expect(pins.pinnedAt(LADDER, 'session-1')).toBeUndefined();
  });

  test('a second conversation at the same router keeps its own branch', () => {
    const pins = createBranchPins(() => NOW);

    pins.pin(LADDER, 'session-1', 'coder');
    pins.pin(LADDER, 'session-2', 'talker');

    expect(pins.pinnedAt(LADDER, 'session-1')).toBe('coder');
    expect(pins.pinnedAt(LADDER, 'session-2')).toBe('talker');
  });

  test('one conversation crossing two routers earns a branch at each', () => {
    const pins = createBranchPins(() => NOW);

    pins.pin(LADDER, 'session-1', 'coder');

    expect(pins.pinnedAt(OTHER_LADDER, 'session-1')).toBeUndefined();
  });

  test('a fresh judgment moves the conversation to the branch it just earned', () => {
    const pins = createBranchPins(() => NOW);

    pins.pin(LADDER, 'session-1', 'coder');
    pins.pin(LADDER, 'session-1', 'talker');

    expect(pins.pinnedAt(LADDER, 'session-1')).toBe('talker');
  });
});

describe('the conversation a gateway stops holding', () => {
  test('a conversation left idle past the window is forgotten', () => {
    const clock = aClock();
    const pins = createBranchPins(clock.now);

    pins.pin(LADDER, 'session-1', 'coder');
    clock.tick(PIN_IDLE_MS + 1);

    expect(pins.pinnedAt(LADDER, 'session-1')).toBeUndefined();
  });

  test('a conversation that keeps talking keeps its branch past the window', () => {
    const clock = aClock();
    const pins = createBranchPins(clock.now);

    pins.pin(LADDER, 'session-1', 'coder');
    clock.tick(PIN_IDLE_MS - 1);
    pins.pinnedAt(LADDER, 'session-1');
    clock.tick(PIN_IDLE_MS - 1);

    expect(pins.pinnedAt(LADDER, 'session-1')).toBe('coder');
  });

  test('the oldest conversation is forgotten first when the store fills', () => {
    const pins = createBranchPins(() => NOW);

    for (let rank = 0; rank <= PINNED_CONVERSATION_LIMIT; rank += 1) {
      pins.pin(LADDER, conversation(rank), 'coder');
    }

    expect(pins.pinnedAt(LADDER, conversation(0))).toBeUndefined();
    expect(pins.pinnedAt(LADDER, conversation(1))).toBe('coder');
    expect(pins.pinnedAt(LADDER, conversation(PINNED_CONVERSATION_LIMIT))).toBe('coder');
  });
});

describe('the law a long-running gateway keeps', () => {
  propertyTest.prop([fc.array(fc.nat({ max: 2_000 }), { maxLength: 1_200 })])(
    'however many conversations pin a branch, the store never holds more than its bound',
    (ranks) => {
      const pins = createBranchPins(() => NOW);

      for (const rank of ranks) pins.pin(LADDER, conversation(rank), 'coder');

      const held = [...new Set(ranks)].filter(
        (rank) => pins.pinnedAt(LADDER, conversation(rank)) !== undefined,
      );

      expect(held.length).toBeLessThanOrEqual(PINNED_CONVERSATION_LIMIT);
    },
  );

  test('a run of twice the bound leaves exactly the bound still held', () => {
    const pins = createBranchPins(() => NOW);
    const written = PINNED_CONVERSATION_LIMIT * 2;

    for (let rank = 0; rank < written; rank += 1) pins.pin(LADDER, conversation(rank), 'coder');

    const held = Array.from({ length: written }, (_unused, rank) => rank).filter(
      (rank) => pins.pinnedAt(LADDER, conversation(rank)) !== undefined,
    );

    expect(held).toHaveLength(PINNED_CONVERSATION_LIMIT);
  });
});

type Counted = { address: RouteNodeAddress; pinned: BranchPinTally };

function aTallyLine(): { heard: Counted[]; tallied: TallyBranchPins } {
  const heard: Counted[] = [];

  return {
    heard,
    tallied: (address, pinned) => {
      heard.push({ address, pinned });
    },
  };
}

describe('what a router says it is holding as conversations arrive', () => {
  test('the first conversation to earn a branch counts one against it', () => {
    const line = aTallyLine();
    const pins = createBranchPins(() => NOW, line.tallied);

    pins.pin(LADDER, 'session-1', 'coder');

    expect(line.heard).toEqual([{ address: LADDER, pinned: { coder: 1 } }]);
  });

  test('a second conversation earning the same branch counts two against it', () => {
    const line = aTallyLine();
    const pins = createBranchPins(() => NOW, line.tallied);

    pins.pin(LADDER, 'session-1', 'coder');
    pins.pin(LADDER, 'session-2', 'coder');

    expect(line.heard.at(-1)?.pinned).toEqual({ coder: 2 });
  });

  test('two branches of one router are counted apart', () => {
    const line = aTallyLine();
    const pins = createBranchPins(() => NOW, line.tallied);

    pins.pin(LADDER, 'session-1', 'coder');
    pins.pin(LADDER, 'session-2', 'talker');

    expect(line.heard.at(-1)?.pinned).toEqual({ coder: 1, talker: 1 });
  });

  test('a re-judged conversation moves between branches rather than counting twice', () => {
    const line = aTallyLine();
    const pins = createBranchPins(() => NOW, line.tallied);

    pins.pin(LADDER, 'session-1', 'coder');
    pins.pin(LADDER, 'session-1', 'talker');

    expect(line.heard.at(-1)?.pinned).toEqual({ talker: 1 });
  });

  test('a router counts only its own conversations, never the router next to it', () => {
    const line = aTallyLine();
    const pins = createBranchPins(() => NOW, line.tallied);

    pins.pin(LADDER, 'session-1', 'coder');
    pins.pin(OTHER_LADDER, 'session-2', 'coder');

    expect(line.heard).toEqual([
      { address: LADDER, pinned: { coder: 1 } },
      { address: OTHER_LADDER, pinned: { coder: 1 } },
    ]);
  });

  test('the count is all that is said, so no conversation crosses with it', () => {
    const line = aTallyLine();
    const pins = createBranchPins(() => NOW, line.tallied);

    pins.pin(LADDER, 'a-recognizable-fingerprint', 'coder');

    expect(JSON.stringify(line.heard)).not.toContain('a-recognizable-fingerprint');
  });
});

describe('what a router says it is holding as conversations leave', () => {
  test('a conversation forgotten for going quiet drops out of the count', () => {
    const clock = aClock();
    const line = aTallyLine();
    const pins = createBranchPins(clock.now, line.tallied);

    pins.pin(LADDER, 'session-1', 'coder');
    clock.tick(PIN_IDLE_MS + 1);
    pins.pinnedAt(LADDER, 'session-1');

    expect(line.heard.at(-1)).toEqual({ address: LADDER, pinned: {} });
  });

  test('a conversation still talking is counted once and said nothing more about', () => {
    const clock = aClock();
    const line = aTallyLine();
    const pins = createBranchPins(clock.now, line.tallied);

    pins.pin(LADDER, 'session-1', 'coder');
    clock.tick(PIN_IDLE_MS - 1);
    pins.pinnedAt(LADDER, 'session-1');

    expect(line.heard).toHaveLength(1);
  });

  test('a conversation dropped to keep the store bounded drops out of the count', () => {
    const line = aTallyLine();
    const pins = createBranchPins(() => NOW, line.tallied);

    for (let rank = 0; rank <= PINNED_CONVERSATION_LIMIT; rank += 1) {
      pins.pin(LADDER, conversation(rank), 'coder');
    }

    expect(line.heard.at(-1)?.pinned).toEqual({ coder: PINNED_CONVERSATION_LIMIT });
  });
});

describe('the pins one gateway holds and no other', () => {
  test('a gateway remembers the branch a conversation earned across requests', () => {
    const memory = routingMemory();

    memory.pins.pin(LADDER, 'session-1', 'coder');

    expect(memory.pins.pinnedAt(LADDER, 'session-1')).toBe('coder');
  });

  test('a second gateway never inherits the conversations the first pinned', () => {
    const first = routingMemory();
    const second = routingMemory();

    first.pins.pin(LADDER, 'session-1', 'coder');

    expect(second.pins.pinnedAt(LADDER, 'session-1')).toBeUndefined();
  });
});
