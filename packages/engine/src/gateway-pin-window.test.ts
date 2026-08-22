import type { MockInstance } from 'vitest';

import { afterEach, describe, expect, test, vi } from 'vitest';

import type { RouteNodeAddress } from './routing/route-node-key';

import { PIN_IDLE_MS, routingMemory } from './gateway-routing-memory';

const LADDER: RouteNodeAddress = { slug: 'codex', virtualModel: 'fast', routeNode: 'ladder' };

function spokenBy(complaints: MockInstance<typeof console.error>): string {
  return complaints.mock.calls.flat().map(String).join(' ');
}

function aPinnedConversation(): { restedFor: (span: number) => string | undefined } {
  const memory = routingMemory('main');

  memory.pins.pin(LADDER, 'session-1', 'coder');

  return {
    restedFor: (span) => {
      vi.advanceTimersByTime(span);

      return memory.pins.pinnedAt(LADDER, 'session-1');
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('the window a pin rests through', () => {
  test('a conversation is forgotten past the ten-minute window when the environment names none', () => {
    vi.useFakeTimers();

    expect(aPinnedConversation().restedFor(PIN_IDLE_MS + 1)).toBeUndefined();
  });

  test('a conversation keeps its branch inside the ten-minute window when the environment names none', () => {
    vi.useFakeTimers();

    expect(aPinnedConversation().restedFor(PIN_IDLE_MS - 1)).toBe('coder');
  });

  test('the environment shortens the window a conversation may rest through', () => {
    vi.useFakeTimers();
    vi.stubEnv('RECOMPOSE_PIN_IDLE_MS', '1000');

    expect(aPinnedConversation().restedFor(1001)).toBeUndefined();
  });

  test('a conversation still talking inside the shortened window keeps its branch', () => {
    vi.useFakeTimers();
    vi.stubEnv('RECOMPOSE_PIN_IDLE_MS', '1000');

    expect(aPinnedConversation().restedFor(999)).toBe('coder');
  });

  test('a window named after the gateway was built leaves that gateway on the window it opened with', () => {
    vi.useFakeTimers();

    const memory = routingMemory('main');

    memory.pins.pin(LADDER, 'session-1', 'coder');
    vi.stubEnv('RECOMPOSE_PIN_IDLE_MS', '1000');
    vi.advanceTimersByTime(1001);

    expect(memory.pins.pinnedAt(LADDER, 'session-1')).toBe('coder');
  });
});

describe('a pin window the environment names badly', () => {
  test('a window that is not a number is refused and the ten-minute default stands', () => {
    vi.useFakeTimers();
    vi.stubEnv('RECOMPOSE_PIN_IDLE_MS', 'ten minutes');

    const complaints = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      expect(aPinnedConversation().restedFor(PIN_IDLE_MS - 1)).toBe('coder');
      expect(spokenBy(complaints)).toContain('RECOMPOSE_PIN_IDLE_MS');
    } finally {
      complaints.mockRestore();
    }
  });

  test('a window of zero is refused and the ten-minute default stands', () => {
    vi.useFakeTimers();
    vi.stubEnv('RECOMPOSE_PIN_IDLE_MS', '0');

    const complaints = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      expect(aPinnedConversation().restedFor(PIN_IDLE_MS - 1)).toBe('coder');
      expect(spokenBy(complaints)).toContain('RECOMPOSE_PIN_IDLE_MS');
    } finally {
      complaints.mockRestore();
    }
  });

  test('a negative window is refused and the ten-minute default stands', () => {
    vi.useFakeTimers();
    vi.stubEnv('RECOMPOSE_PIN_IDLE_MS', '-1000');

    const complaints = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      expect(aPinnedConversation().restedFor(PIN_IDLE_MS - 1)).toBe('coder');
      expect(spokenBy(complaints)).toContain('RECOMPOSE_PIN_IDLE_MS');
    } finally {
      complaints.mockRestore();
    }
  });

  test('a window the environment leaves blank is passed over without complaint', () => {
    vi.useFakeTimers();
    vi.stubEnv('RECOMPOSE_PIN_IDLE_MS', '   ');

    const complaints = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      expect(aPinnedConversation().restedFor(PIN_IDLE_MS - 1)).toBe('coder');
      expect(complaints).not.toHaveBeenCalled();
    } finally {
      complaints.mockRestore();
    }
  });
});
