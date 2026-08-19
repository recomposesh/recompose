import { describe, expect, test } from 'vitest';

import type { Crossing, JsonObject } from './gateway-wire';

import { conversationFingerprint } from './gateway-conversation-key';

function crossing(raw: JsonObject, sessionId?: string): Crossing {
  return {
    dialect: 'chat-completions',
    raw,
    gatewayName: 'Codex',
    virtualModel: 'fast',
    providerModel: 'gpt-5-mini',
    ...(sessionId === undefined ? {} : { sessionId }),
  };
}

function turns(...spoken: readonly string[]): JsonObject {
  return {
    model: 'fast',
    messages: spoken.map((content) => ({ role: 'user', content })),
  };
}

describe('the mark a conversation carrying its own key is known by', () => {
  test('two turns under one client key read as one conversation', () => {
    const first = conversationFingerprint(crossing(turns('hello'), 'session-1'));
    const second = conversationFingerprint(crossing(turns('and now this'), 'session-1'));

    expect(second).toBe(first);
  });

  test('two client keys read as two conversations even when the words match', () => {
    const first = conversationFingerprint(crossing(turns('hello'), 'session-1'));
    const second = conversationFingerprint(crossing(turns('hello'), 'session-2'));

    expect(second).not.toBe(first);
  });

  test('a client key wins over what the caller said', () => {
    const keyed = conversationFingerprint(crossing(turns('hello'), 'session-1'));
    const unkeyed = conversationFingerprint(crossing(turns('hello')));

    expect(keyed).not.toBe(unkeyed);
  });
});

describe('the mark a conversation carrying no key is known by', () => {
  test('a later turn of the same conversation reads the same mark', () => {
    const opening = conversationFingerprint(crossing(turns('write me a parser')));
    const later = conversationFingerprint(
      crossing(turns('write me a parser', 'now add a test for it')),
    );

    expect(later).toBe(opening);
  });

  test('a system prompt restamped every turn never moves the conversation', () => {
    const raw = turns('write me a parser');
    const opening = conversationFingerprint(
      crossing({ ...raw, system: 'Current date and time: 09:00' }),
    );
    const later = conversationFingerprint(
      crossing({ ...raw, system: 'Current date and time: 09:31' }),
    );

    expect(later).toBe(opening);
  });

  test('two conversations that opened with different words never share a mark', () => {
    const one = conversationFingerprint(crossing(turns('write me a parser')));
    const other = conversationFingerprint(crossing(turns('what is the weather')));

    expect(other).not.toBe(one);
  });

  test('a request carrying nothing the caller said still reads a mark', () => {
    expect(conversationFingerprint(crossing({ model: 'fast' }))).not.toBe('');
  });
});
