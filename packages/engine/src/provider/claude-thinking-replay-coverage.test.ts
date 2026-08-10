import { describe, expect, test } from 'vitest';

import type { JsonObject } from '../gateway-wire';

import { ClaudeThinkingReplay } from './claude-thinking-replay';

const HOUR_MS = 60 * 60 * 1000;

const firstTurn = [
  { type: 'thinking', thinking: 'first reasoning', signature: 'claude-signature-1' },
  { type: 'text', text: 'I will read the file.' },
  { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { path: 'README.md' } },
];

const secondTurn = [
  { type: 'thinking', thinking: 'second reasoning', signature: 'claude-signature-2' },
  { type: 'tool_use', id: 'toolu_2', name: 'Write', input: { path: 'NOTES.md' } },
];

function compactedAssistant(turn: JsonObject[]): JsonObject {
  return {
    role: 'assistant',
    content: turn.filter((part) => part['type'] !== 'thinking'),
  };
}

function compactedBody(...turns: JsonObject[][]): JsonObject {
  return {
    messages: [{ role: 'user', content: 'inspect' }, ...turns.map(compactedAssistant)],
  };
}

function aTurn(ordinal: number): JsonObject[] {
  return [
    { type: 'thinking', thinking: `reasoning ${ordinal}`, signature: `signature-${ordinal}` },
    { type: 'tool_use', id: `toolu_${ordinal}`, name: 'Read', input: { path: `file-${ordinal}` } },
  ];
}

function paddedTurn(ordinal: number, thinking: string): JsonObject[] {
  return [
    { type: 'thinking', thinking, signature: `padded-${ordinal}` },
    { type: 'tool_use', id: `toolu_${ordinal}`, name: 'Read', input: {} },
  ];
}

function turnOfBytes(ordinal: number, bytes: number): JsonObject[] {
  const skeletonBytes = Buffer.byteLength(JSON.stringify(paddedTurn(ordinal, '')));

  return paddedTurn(ordinal, 'x'.repeat(bytes - skeletonBytes));
}

describe('the moment held turns stop counting', () => {
  test('a turn read on its expiry instant is gone', () => {
    let now = 0;
    const replay = new ClaudeThinkingReplay(() => now);

    replay.commit('claude-sonnet-4-5', 'scope', firstTurn);
    now = HOUR_MS;

    expect(replay.inject('claude-sonnet-4-5', 'scope', compactedBody(firstTurn)).applied).toBe(
      false,
    );
  });

  test('a turn read one tick before its expiry still replays', () => {
    let now = 0;
    const replay = new ClaudeThinkingReplay(() => now);

    replay.commit('claude-sonnet-4-5', 'scope', firstTurn);
    now = HOUR_MS - 1;

    expect(replay.inject('claude-sonnet-4-5', 'scope', compactedBody(firstTurn)).applied).toBe(
      true,
    );
  });

  test('a replay read within the hour keeps the turns alive past it', () => {
    let now = 0;
    const replay = new ClaudeThinkingReplay(() => now);

    replay.commit('claude-sonnet-4-5', 'scope', firstTurn);
    now = HOUR_MS - 1;
    replay.inject('claude-sonnet-4-5', 'scope', compactedBody(firstTurn));
    now = 2 * HOUR_MS - 2;

    expect(replay.inject('claude-sonnet-4-5', 'scope', compactedBody(firstTurn)).applied).toBe(
      true,
    );
  });
});

describe('the turns one session may hold', () => {
  test('drops the oldest turn once a session holds more than sixty-four', () => {
    const replay = new ClaudeThinkingReplay();

    for (let ordinal = 0; ordinal <= 64; ordinal += 1) {
      replay.commit('claude-sonnet-4-5', 'scope', aTurn(ordinal));
    }

    const injected = replay.inject(
      'claude-sonnet-4-5',
      'scope',
      compactedBody(aTurn(0), aTurn(1), aTurn(64)),
    );

    expect(injected.body).not.toHaveProperty('messages.1.content.0.signature');
    expect(injected.body).toHaveProperty('messages.2.content.0.signature', 'signature-1');
    expect(injected.body).toHaveProperty('messages.3.content.0.signature', 'signature-64');
  });

  test('committing the same turn twice holds it once', () => {
    const replay = new ClaudeThinkingReplay();

    replay.commit('claude-sonnet-4-5', 'scope', firstTurn);
    const bytesAfterFirst = replay.totalBytes();

    expect(replay.commit('claude-sonnet-4-5', 'scope', firstTurn)).toBe(true);
    expect(replay.totalBytes()).toBe(bytesAfterFirst);
  });
});

describe('the bytes one session may weigh', () => {
  test('accepts a turn at exactly the session byte bound', () => {
    const replay = new ClaudeThinkingReplay();

    expect(replay.commit('claude-sonnet-4-5', 'scope', turnOfBytes(1, 8 * 1024 * 1024))).toBe(true);
  });

  test('refuses a single turn larger than the session byte bound', () => {
    const replay = new ClaudeThinkingReplay();
    const oversized = turnOfBytes(1, 8 * 1024 * 1024 + 1);

    expect(replay.commit('claude-sonnet-4-5', 'scope', oversized)).toBe(false);
    expect(replay.inject('claude-sonnet-4-5', 'scope', compactedBody(oversized)).applied).toBe(
      false,
    );
  });

  test('keeps every turn while a session sits exactly on its byte bound', () => {
    const replay = new ClaudeThinkingReplay();

    replay.commit('claude-sonnet-4-5', 'scope', turnOfBytes(1, 4 * 1024 * 1024));
    replay.commit('claude-sonnet-4-5', 'scope', turnOfBytes(2, 4 * 1024 * 1024));

    const injected = replay.inject(
      'claude-sonnet-4-5',
      'scope',
      compactedBody(turnOfBytes(1, 4 * 1024 * 1024), turnOfBytes(2, 4 * 1024 * 1024)),
    );

    expect(injected.body).toHaveProperty('messages.1.content.0.signature', 'padded-1');
    expect(injected.body).toHaveProperty('messages.2.content.0.signature', 'padded-2');
  });

  test('drops older turns once a session outgrows its byte bound', () => {
    const replay = new ClaudeThinkingReplay();

    replay.commit('claude-sonnet-4-5', 'scope', turnOfBytes(1, 5 * 1024 * 1024));
    replay.commit('claude-sonnet-4-5', 'scope', turnOfBytes(2, 5 * 1024 * 1024));

    const injected = replay.inject(
      'claude-sonnet-4-5',
      'scope',
      compactedBody(turnOfBytes(1, 5 * 1024 * 1024), turnOfBytes(2, 5 * 1024 * 1024)),
    );

    expect(injected.body).not.toHaveProperty('messages.1.content.0.signature');
    expect(injected.body).toHaveProperty('messages.2.content.0.signature', 'padded-2');
  });
});

describe('evicting whole sessions', () => {
  test('evicts the oldest session once the store holds more than its cap', () => {
    const replay = new ClaudeThinkingReplay();

    for (let ordinal = 0; ordinal <= 10_240; ordinal += 1) {
      replay.commit('claude-sonnet-4-5', `scope-${ordinal}`, firstTurn);
    }

    expect(replay.inject('claude-sonnet-4-5', 'scope-0', compactedBody(firstTurn)).applied).toBe(
      false,
    );
    expect(replay.inject('claude-sonnet-4-5', 'scope-1', compactedBody(firstTurn)).applied).toBe(
      true,
    );
  });

  test('a session read recently outlives eviction over one never read again', () => {
    const replay = new ClaudeThinkingReplay();

    for (let ordinal = 0; ordinal < 10_240; ordinal += 1) {
      replay.commit('claude-sonnet-4-5', `scope-${ordinal}`, firstTurn);
    }

    replay.inject('claude-sonnet-4-5', 'scope-0', compactedBody(firstTurn));
    replay.commit('claude-sonnet-4-5', 'scope-fresh', firstTurn);

    expect(replay.inject('claude-sonnet-4-5', 'scope-0', compactedBody(firstTurn)).applied).toBe(
      true,
    );
    expect(replay.inject('claude-sonnet-4-5', 'scope-1', compactedBody(firstTurn)).applied).toBe(
      false,
    );
  });
});

describe('commits the store turns away', () => {
  test('refuses a commit without a scope or without replayable content', () => {
    const replay = new ClaudeThinkingReplay();

    expect(replay.commit('claude-sonnet-4-5', '   ', firstTurn)).toBe(false);
    expect(replay.commit('claude-sonnet-4-5', 'scope', 'not a list')).toBe(false);
    expect(replay.commit('claude-sonnet-4-5', 'scope', [{ type: 'text', text: 'plain' }])).toBe(
      false,
    );
  });

  test('unsigned thinking or a missing tool call cannot be committed', () => {
    const replay = new ClaudeThinkingReplay();

    expect(
      replay.commit('claude-sonnet-4-5', 'scope', [
        { type: 'thinking', thinking: 'reason', signature: '   ' },
        { type: 'tool_use', id: 'toolu_1', name: 'Read', input: {} },
      ]),
    ).toBe(false);
    expect(
      replay.commit('claude-sonnet-4-5', 'scope', [
        { type: 'thinking', thinking: 'reason', signature: 'sig' },
      ]),
    ).toBe(false);
  });
});

describe('clearing', () => {
  test('clearing a session that holds nothing changes nothing', () => {
    const replay = new ClaudeThinkingReplay();

    replay.clear('claude-sonnet-4-5', 'missing-scope');

    expect(replay.totalBytes()).toBe(0);
  });

  test('clearing a session releases its bytes', () => {
    const replay = new ClaudeThinkingReplay();

    replay.commit('claude-sonnet-4-5', 'scope', firstTurn);

    expect(replay.totalBytes()).toBeGreaterThan(0);

    replay.clear('claude-sonnet-4-5', 'scope');

    expect(replay.totalBytes()).toBe(0);
  });

  test('clearing one session leaves the others holding their turns', () => {
    const replay = new ClaudeThinkingReplay();

    replay.commit('claude-sonnet-4-5', 'scope-a', firstTurn);
    replay.commit('claude-sonnet-4-5', 'scope-b', secondTurn);
    replay.clear('claude-sonnet-4-5', 'scope-a');

    expect(replay.inject('claude-sonnet-4-5', 'scope-a', compactedBody(firstTurn)).applied).toBe(
      false,
    );
    expect(replay.inject('claude-sonnet-4-5', 'scope-b', compactedBody(secondTurn)).applied).toBe(
      true,
    );
  });

  test('clearing everything releases every held byte', () => {
    const replay = new ClaudeThinkingReplay();

    replay.commit('claude-sonnet-4-5', 'scope-a', firstTurn);
    replay.commit('claude-opus-4', 'scope-b', secondTurn);

    expect(replay.totalBytes()).toBeGreaterThan(0);

    replay.clearAll();

    expect(replay.totalBytes()).toBe(0);
  });
});
