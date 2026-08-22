import { describe, expect, test } from 'vitest';

import type { KeptChild } from './gateway-kept-child';

import {
  createConversationPins,
  PIN_IDLE_MS,
  PINNED_CONVERSATION_LIMIT,
} from './gateway-routing-memory';

const NOW = 1_700_000_000_000;

const LADDER = { slug: 'main', virtualModel: 'fast', routeNode: 'ladder' };

function aKeepingHolding(...restored: readonly KeptChild[]) {
  const held: { handedOver: readonly KeptChild[] } = { handedOver: [] };

  return {
    held,
    keeping: {
      restored: () => restored,
      keep: (records: readonly KeptChild[]) => {
        held.handedOver = records;
      },
    },
  };
}

function aKeptChild(fingerprint: string, child: string, touchedAtMs = NOW): KeptChild {
  return { ...LADDER, fingerprint, child, touchedAtMs };
}

describe('the children a store opens holding, from whatever kept them last', () => {
  test('a conversation pinned before the store closed finds its child again', () => {
    const kept = aKeepingHolding(aKeptChild('session-1', 'one'));

    const pins = createConversationPins(() => NOW, undefined, PIN_IDLE_MS, kept.keeping);

    expect(pins.pinnedAt(LADDER, 'session-1')).toBe('one');
  });

  test('a conversation that went quiet past the window comes back to nothing', () => {
    const kept = aKeepingHolding(aKeptChild('session-1', 'one', NOW - PIN_IDLE_MS - 1));

    const pins = createConversationPins(() => NOW, undefined, PIN_IDLE_MS, kept.keeping);

    expect(pins.pinnedAt(LADDER, 'session-1')).toBeUndefined();
  });

  test('the latest child a conversation earned is the one it opens with', () => {
    const kept = aKeepingHolding(
      aKeptChild('session-1', 'one', NOW - 2),
      aKeptChild('session-1', 'two', NOW - 1),
    );

    const pins = createConversationPins(() => NOW, undefined, PIN_IDLE_MS, kept.keeping);

    expect(pins.pinnedAt(LADDER, 'session-1')).toBe('two');
  });

  test('a store opening on more conversations than it holds keeps the ones that spoke last', () => {
    const overfull = Array.from({ length: PINNED_CONVERSATION_LIMIT + 1 }, (_unused, rank) =>
      aKeptChild(`session-${String(rank)}`, 'one', NOW - PINNED_CONVERSATION_LIMIT + rank),
    );
    const kept = aKeepingHolding(...overfull);

    const pins = createConversationPins(() => NOW, undefined, PIN_IDLE_MS, kept.keeping);

    expect(pins.pinnedAt(LADDER, 'session-0')).toBeUndefined();
    expect(pins.pinnedAt(LADDER, `session-${String(PINNED_CONVERSATION_LIMIT)}`)).toBe('one');
  });
});

describe('what a store hands to whatever will keep its children', () => {
  test('a pinned conversation is handed over the moment it is written', () => {
    const kept = aKeepingHolding();

    const pins = createConversationPins(() => NOW, undefined, PIN_IDLE_MS, kept.keeping);

    pins.pin(LADDER, 'session-1', 'one');

    expect(kept.held.handedOver).toEqual([aKeptChild('session-1', 'one')]);
  });

  test('a conversation that only reads its pin is handed over again, speaking now', () => {
    let clock = NOW;
    const kept = aKeepingHolding(aKeptChild('session-1', 'one', NOW));

    const pins = createConversationPins(() => clock, undefined, PIN_IDLE_MS, kept.keeping);

    clock = NOW + 1_000;
    pins.pinnedAt(LADDER, 'session-1');

    expect(kept.held.handedOver).toEqual([aKeptChild('session-1', 'one', NOW + 1_000)]);
  });

  test('a store nobody wired a keeper to still pins in memory', () => {
    const pins = createConversationPins(() => NOW);

    pins.pin(LADDER, 'session-1', 'one');

    expect(pins.pinnedAt(LADDER, 'session-1')).toBe('one');
  });
});
