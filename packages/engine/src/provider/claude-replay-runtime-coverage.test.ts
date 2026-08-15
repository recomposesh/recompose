import { beforeEach, describe, expect, test } from 'vitest';

import type { Crossing, JsonObject } from '../gateway-wire';

import {
  clearClaudeReplayCache,
  observeClaudeReplay,
  prepareClaudeReplay,
} from './claude-replay-runtime';

const ACCOUNT = 'account-1';

const cachedContent = [
  { type: 'thinking', thinking: 'full reasoning', signature: 'claude-signature' },
  { type: 'text', text: 'I will inspect the file.' },
  { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { path: 'README.md' } },
];

function aClaudeCrossing(overrides: Partial<Crossing> = {}): Crossing {
  return {
    dialect: 'anthropic',
    raw: {},
    gatewayName: 'workbench',
    virtualModel: 'sonnet',
    providerModel: 'claude-sonnet-4-5',
    replayScopeId: 'scope-1',
    callerFingerprint: 'caller-1',
    isCompat: true,
    ...overrides,
  };
}

function aCompactedBody(): JsonObject {
  return {
    messages: [
      { role: 'user', content: 'inspect' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'I will inspect the file.' },
          { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { path: 'README.md' } },
        ],
      },
    ],
  };
}

function anEventStream(payload: string): Response {
  return new Response(payload, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

async function havingServed(crossing: Crossing, answer: Response): Promise<Response> {
  return observeClaudeReplay(crossing, answer, ACCOUNT);
}

function aSignedTurn(): Response {
  return Response.json({ content: cachedContent });
}

function whatTheNextTurnCarries(crossing: Crossing = aClaudeCrossing()): JsonObject {
  return prepareClaudeReplay(crossing, aCompactedBody(), ACCOUNT);
}

beforeEach(() => {
  clearClaudeReplayCache();
});

describe('the sessions a Claude replay is willing to serve', () => {
  test('a native model without compatibility enabled is left alone', async () => {
    const native = aClaudeCrossing({ isCompat: false });

    await havingServed(native, aSignedTurn());

    expect(whatTheNextTurnCarries(native)).toEqual(aCompactedBody());
  });

  test('a crossing outside the anthropic dialect is left alone', async () => {
    await havingServed(aClaudeCrossing({ dialect: 'chat-completions' }), aSignedTurn());

    expect(whatTheNextTurnCarries()).toEqual(aCompactedBody());
  });

  test('a crossing without a session identity is left alone', async () => {
    const anonymous = aClaudeCrossing({ replayScopeId: undefined });

    await havingServed(anonymous, aSignedTurn());

    expect(whatTheNextTurnCarries(anonymous)).toEqual(aCompactedBody());
    expect(whatTheNextTurnCarries()).toEqual(aCompactedBody());
  });

  test('a crossing without a caller fingerprint is left alone', async () => {
    const anonymous = aClaudeCrossing({ callerFingerprint: undefined });

    await havingServed(anonymous, aSignedTurn());

    expect(whatTheNextTurnCarries(anonymous)).toEqual(aCompactedBody());
    expect(whatTheNextTurnCarries()).toEqual(aCompactedBody());
  });
});

describe('observeClaudeReplay: an answer the cache cannot read', () => {
  test('caches nothing when the answer is a list rather than a message', async () => {
    await havingServed(aClaudeCrossing(), Response.json([]));

    expect(whatTheNextTurnCarries()).toEqual(aCompactedBody());
  });

  test('caches nothing when the message carries no content', async () => {
    await havingServed(aClaudeCrossing(), Response.json({ id: 'msg_1' }));

    expect(whatTheNextTurnCarries()).toEqual(aCompactedBody());
  });

  test('returns a streamed answer that carries no body as it arrived', async () => {
    const response = new Response(null, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });

    expect(await havingServed(aClaudeCrossing(), response)).toBe(response);
  });

  test('an answer without a content type passes through unread', async () => {
    const bare = new Response(null, { status: 200 });

    expect(await havingServed(aClaudeCrossing(), bare)).toBe(bare);
  });

  test('an unreadable answer leaves earlier turns in place', async () => {
    await havingServed(aClaudeCrossing(), aSignedTurn());
    await havingServed(aClaudeCrossing(), Response.json({ id: 'msg_1' }));

    expect(whatTheNextTurnCarries()).toHaveProperty('messages.1.content', cachedContent);
  });

  test('an error answer never contributes turns', async () => {
    await havingServed(
      aClaudeCrossing(),
      Response.json({ content: cachedContent }, { status: 500 }),
    );

    expect(whatTheNextTurnCarries()).toEqual(aCompactedBody());
  });

  test('a streamed answer keeps its headers while observed', async () => {
    const observed = await havingServed(
      aClaudeCrossing(),
      anEventStream('data: {"type":"message_start"}\n\n'),
    );

    expect(observed.headers.get('content-type')).toBe('text/event-stream');

    await observed.text();
  });
});

describe('observeClaudeReplay: a replayed request that fails upstream', () => {
  test('drops the cached thinking so the next request is not replayed again', async () => {
    await havingServed(aClaudeCrossing(), aSignedTurn());
    const replayed = aClaudeCrossing();

    expect(whatTheNextTurnCarries(replayed)).toHaveProperty('messages.1.content', cachedContent);

    const failed = await havingServed(replayed, anEventStream('data: {"type":"error"}\n\n'));

    await failed.text();

    expect(whatTheNextTurnCarries()).toEqual(aCompactedBody());
  });

  test('a rejection clears only a replay that was actually applied', async () => {
    await havingServed(aClaudeCrossing(), aSignedTurn());
    const unmatched = aClaudeCrossing();

    prepareClaudeReplay(unmatched, { messages: [{ role: 'user', content: 'hello' }] }, ACCOUNT);
    await havingServed(unmatched, Response.json({ error: {} }, { status: 400 }));

    expect(whatTheNextTurnCarries()).toHaveProperty('messages.1.content', cachedContent);
  });

  test('an abandoned stream leaves earlier turns held', async () => {
    await havingServed(aClaudeCrossing(), aSignedTurn());
    const replayed = aClaudeCrossing();

    whatTheNextTurnCarries(replayed);

    const answer = await havingServed(
      replayed,
      anEventStream(
        'data: {"type":"message_start"}\n\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"future_delta"}}\n\ndata: {"type":"message_stop"}\n\n',
      ),
    );

    await answer.text();

    expect(whatTheNextTurnCarries()).toHaveProperty('messages.1.content', cachedContent);
  });

  test('an errored stream leaves turns held for a request that was not replayed', async () => {
    await havingServed(aClaudeCrossing(), aSignedTurn());
    const fresh = aClaudeCrossing();

    const answer = await havingServed(fresh, anEventStream('data: {"type":"error"}\n\n'));

    await answer.text();

    expect(whatTheNextTurnCarries()).toHaveProperty('messages.1.content', cachedContent);
  });
});

describe('clearing the runtime cache', () => {
  test('clearing the cache forgets every held turn', async () => {
    await havingServed(aClaudeCrossing(), aSignedTurn());
    clearClaudeReplayCache();

    expect(whatTheNextTurnCarries()).toEqual(aCompactedBody());
  });
});

describe('observeClaudeReplay: a final answer without signed thinking', () => {
  test('drops the held turns so stale reasoning never replays forward', async () => {
    await havingServed(aClaudeCrossing(), aSignedTurn());
    await havingServed(
      aClaudeCrossing(),
      Response.json({ content: [{ type: 'text', text: 'done' }] }),
    );

    expect(whatTheNextTurnCarries()).toEqual(aCompactedBody());
  });
});
