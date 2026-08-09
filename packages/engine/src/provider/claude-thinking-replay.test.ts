import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import type { JsonObject } from '../gateway-wire';

import { ClaudeThinkingReplay, claudeThinkingReplayModelFamily } from './claude-thinking-replay';

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

describe('claudeThinkingReplayModelFamily', () => {
  test.each([
    ['claude-sonnet-4-5(high)', 'claude-sonnet-4-5'],
    ['claude-sonnet-4-5(31999)', 'claude-sonnet-4-5'],
    ['  claude-opus-4  ', 'claude-opus-4'],
    ['claude-sonnet-4-5', 'claude-sonnet-4-5'],
  ])('maps %s to %s', (model, family) => {
    expect(claudeThinkingReplayModelFamily(model)).toBe(family);
  });
});

describe('replay into the following request', () => {
  test('restores a committed turn with its signature intact', () => {
    const replay = new ClaudeThinkingReplay();

    expect(replay.commit('claude-sonnet-4-5', 'scope', firstTurn)).toBe(true);

    const injected = replay.inject('claude-sonnet-4-5', 'scope', compactedBody(firstTurn));

    expect(injected.applied).toBe(true);
    expect(injected.body).toHaveProperty('messages.1.content', firstTurn);
  });

  test('shares the replay across reasoning suffix variants of one model', () => {
    const replay = new ClaudeThinkingReplay();

    replay.commit('claude-sonnet-4-5(high)', 'scope', firstTurn);

    expect(replay.inject('claude-sonnet-4-5', 'scope', compactedBody(firstTurn)).applied).toBe(
      true,
    );
  });

  test('restores every committed turn of the conversation in order', () => {
    const replay = new ClaudeThinkingReplay();

    replay.commit('claude-sonnet-4-5', 'scope', firstTurn);
    replay.commit('claude-sonnet-4-5', 'scope', secondTurn);

    const injected = replay.inject(
      'claude-sonnet-4-5',
      'scope',
      compactedBody(firstTurn, secondTurn),
    );

    expect(injected.applied).toBe(true);
    expect(injected.body).toHaveProperty('messages.1.content', firstTurn);
    expect(injected.body).toHaveProperty('messages.2.content', secondTurn);
  });
});

describe('the signatures a replay carries back', () => {
  test.prop([fc.string({ minLength: 1, maxLength: 64 }).filter((value) => value.trim() !== '')])(
    'a committed signature comes back exactly as the provider signed it',
    (signature) => {
      const replay = new ClaudeThinkingReplay();
      const turn = [
        { type: 'thinking', thinking: 'reasoning', signature },
        { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { path: 'README.md' } },
      ];

      expect(replay.commit('claude-sonnet-4-5', 'scope', turn)).toBe(true);
      expect(replay.inject('claude-sonnet-4-5', 'scope', compactedBody(turn)).body).toHaveProperty(
        'messages.1.content.0.signature',
        signature,
      );
    },
  );
});

describe('requests the replay leaves alone', () => {
  test('a request without a matching compacted assistant is untouched', () => {
    const replay = new ClaudeThinkingReplay();

    replay.commit('claude-sonnet-4-5', 'scope', firstTurn);

    const stranger = { messages: [{ role: 'user', content: 'hello' }] };
    const injected = replay.inject('claude-sonnet-4-5', 'scope', stranger);

    expect(injected.applied).toBe(false);
    expect(injected.body).toEqual(stranger);
  });
});

describe('isolation', () => {
  test('a turn committed for one model never replays into another', () => {
    const replay = new ClaudeThinkingReplay();

    replay.commit('claude-sonnet-4-5', 'scope', firstTurn);

    expect(replay.inject('claude-opus-4', 'scope', compactedBody(firstTurn)).applied).toBe(false);
  });

  test('isolates Claude root and subagent sessions', () => {
    const replay = new ClaudeThinkingReplay();
    const root = 'caller-1:claude:session-1:agent:main';
    const subagent = 'caller-1:claude:session-1:agent:subagent-1';

    replay.commit('claude-sonnet-4-5', root, firstTurn);

    expect(replay.inject('claude-sonnet-4-5', root, compactedBody(firstTurn)).applied).toBe(true);
    expect(replay.inject('claude-sonnet-4-5', subagent, compactedBody(firstTurn)).applied).toBe(
      false,
    );
  });
});
