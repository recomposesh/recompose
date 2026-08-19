import type { BranchPinTally } from '@recompose/contracts';

import { fc, test as propertyTest } from '@fast-check/vitest';
import { describe, expect, test } from 'vitest';

import type { RouteNodeAddress } from './routing/route-node-key';

import { createBranchPins, PIN_IDLE_MS, PINNED_CONVERSATION_LIMIT } from './gateway-routing-memory';

const NOW = 1_700_000_000_000;

const LADDER: RouteNodeAddress = { slug: 'codex', virtualModel: 'fast', routeNode: 'ladder' };

const BRANCHES = ['coder', 'talker', 'writer', 'reviewer'] as const;

type Judgment = { conversation: number; branch: number };

function conversation(rank: number): string {
  return `conversation-${String(rank)}`;
}

function branchOf(rank: number): string {
  return BRANCHES[rank % BRANCHES.length] ?? 'coder';
}

function aClock(): { now: () => number; tick: (span: number) => void } {
  let at = NOW;

  return {
    now: () => at,
    tick: (span) => {
      at += span;
    },
  };
}

function aTallyLine(now: () => number = () => NOW) {
  const heard: BranchPinTally[] = [];

  return {
    heard,
    pins: createBranchPins(now, (_address, pinned) => {
      heard.push(pinned);
    }),
  };
}

function counting(tally: BranchPinTally | undefined): number {
  return Object.values(tally ?? {}).reduce((running, count) => running + count, 0);
}

const judgment = fc.record({
  conversation: fc.nat({ max: 15 }),
  branch: fc.nat({ max: BRANCHES.length - 1 }),
});

describe('the law a branch count keeps', () => {
  propertyTest.prop([fc.array(judgment, { minLength: 1, maxLength: 60 })])(
    'however conversations are judged and re-judged, each is counted once and never below zero',
    (judgments: readonly Judgment[]) => {
      const line = aTallyLine();
      const standing = new Map<string, string>();

      for (const judged of judgments) {
        line.pins.pin(LADDER, conversation(judged.conversation), branchOf(judged.branch));
        standing.set(conversation(judged.conversation), branchOf(judged.branch));
      }

      const tally = line.heard.at(-1);

      expect(Object.values(tally ?? {}).every((count) => count > 0)).toBe(true);
      expect(counting(tally)).toBe(standing.size);
    },
  );

  test('three conversations across two branches count three, split as they were judged', () => {
    const line = aTallyLine();

    line.pins.pin(LADDER, 'session-1', 'coder');
    line.pins.pin(LADDER, 'session-2', 'coder');
    line.pins.pin(LADDER, 'session-3', 'talker');

    expect(line.heard.at(-1)).toEqual({ coder: 2, talker: 1 });
  });

  test('a conversation judged again onto the same branch is still one conversation', () => {
    const line = aTallyLine();

    line.pins.pin(LADDER, 'session-1', 'coder');
    line.pins.pin(LADDER, 'session-1', 'coder');

    expect(line.heard.at(-1)).toEqual({ coder: 1 });
  });

  test('a conversation judged onto another branch leaves the branch it came from', () => {
    const line = aTallyLine();

    line.pins.pin(LADDER, 'session-1', 'coder');
    line.pins.pin(LADDER, 'session-2', 'coder');
    line.pins.pin(LADDER, 'session-1', 'talker');

    expect(line.heard.at(-1)).toEqual({ coder: 1, talker: 1 });
  });
});

describe('the law a forgotten conversation keeps', () => {
  propertyTest.prop([fc.uniqueArray(fc.nat({ max: 20 }), { minLength: 1, maxLength: 12 })])(
    'however many conversations go quiet past the window, none of them is still counted',
    (ranks: readonly number[]) => {
      const clock = aClock();
      const line = aTallyLine(clock.now);

      for (const rank of ranks) line.pins.pin(LADDER, conversation(rank), branchOf(rank));

      clock.tick(PIN_IDLE_MS + 1);

      for (const rank of ranks) line.pins.pinnedAt(LADDER, conversation(rank));

      expect(counting(line.heard.at(-1))).toBe(0);
    },
  );

  test('the conversation that went quiet drops out while the one still talking stays', () => {
    const clock = aClock();
    const line = aTallyLine(clock.now);

    line.pins.pin(LADDER, 'session-1', 'coder');
    clock.tick(PIN_IDLE_MS - 1);
    line.pins.pin(LADDER, 'session-2', 'talker');
    clock.tick(2);
    line.pins.pinnedAt(LADDER, 'session-1');

    expect(line.heard.at(-1)).toEqual({ talker: 1 });
  });

  test('a conversation nobody has read is counted until somebody asks after it', () => {
    const clock = aClock();
    const line = aTallyLine(clock.now);

    line.pins.pin(LADDER, 'session-1', 'coder');
    clock.tick(PIN_IDLE_MS + 1);

    expect(line.heard.at(-1)).toEqual({ coder: 1 });
  });
});

describe('what one changed count costs the windows', () => {
  test('a write that also drops somebody else says what the router holds once', () => {
    const line = aTallyLine();
    const written = PINNED_CONVERSATION_LIMIT + 1;

    for (let rank = 0; rank < written; rank += 1) {
      line.pins.pin(LADDER, conversation(rank), 'coder');
    }

    expect(line.heard).toHaveLength(written);
  });
});
