import { beforeEach, describe, expect, test } from 'vitest';

import type { Crossing, JsonObject } from '../gateway-wire';

import {
  clearClaudeReplayCache,
  observeClaudeReplay,
  prepareClaudeReplay,
} from './claude-replay-runtime';

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

beforeEach(() => {
  clearClaudeReplayCache();
});

describe('the sessions a Claude replay is willing to serve', () => {
  test('a native model without compatibility enabled is left alone', async () => {
    const native = aClaudeCrossing({ isCompat: false });

    await observeClaudeReplay(native, Response.json({ content: cachedContent }));

    expect(prepareClaudeReplay(native, aCompactedBody())).toEqual(aCompactedBody());
  });

  test('a crossing outside the anthropic dialect is left alone', async () => {
    await observeClaudeReplay(
      aClaudeCrossing({ dialect: 'chat-completions' }),
      Response.json({ content: cachedContent }),
    );

    expect(prepareClaudeReplay(aClaudeCrossing(), aCompactedBody())).toEqual(aCompactedBody());
  });

  test('a crossing without a session identity is left alone', async () => {
    await observeClaudeReplay(
      aClaudeCrossing({ replayScopeId: undefined }),
      Response.json({ content: cachedContent }),
    );

    expect(
      prepareClaudeReplay(aClaudeCrossing({ replayScopeId: undefined }), aCompactedBody()),
    ).toEqual(aCompactedBody());
    expect(prepareClaudeReplay(aClaudeCrossing(), aCompactedBody())).toEqual(aCompactedBody());
  });

  test('a crossing without a caller fingerprint is left alone', async () => {
    await observeClaudeReplay(
      aClaudeCrossing({ callerFingerprint: undefined }),
      Response.json({ content: cachedContent }),
    );

    expect(
      prepareClaudeReplay(aClaudeCrossing({ callerFingerprint: undefined }), aCompactedBody()),
    ).toEqual(aCompactedBody());
    expect(prepareClaudeReplay(aClaudeCrossing(), aCompactedBody())).toEqual(aCompactedBody());
  });
});

describe('observeClaudeReplay: an answer the cache cannot read', () => {
  test('caches nothing when the answer is a list rather than a message', async () => {
    await observeClaudeReplay(aClaudeCrossing(), Response.json([]));

    expect(prepareClaudeReplay(aClaudeCrossing(), aCompactedBody())).toEqual(aCompactedBody());
  });

  test('caches nothing when the message carries no content', async () => {
    await observeClaudeReplay(aClaudeCrossing(), Response.json({ id: 'msg_1' }));

    expect(prepareClaudeReplay(aClaudeCrossing(), aCompactedBody())).toEqual(aCompactedBody());
  });

  test('returns a streamed answer that carries no body as it arrived', async () => {
    const response = new Response(null, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });

    expect(await observeClaudeReplay(aClaudeCrossing(), response)).toBe(response);
  });

  test('an answer without a content type passes through unread', async () => {
    const bare = new Response(null, { status: 200 });

    expect(await observeClaudeReplay(aClaudeCrossing(), bare)).toBe(bare);
  });

  test('an unreadable answer leaves earlier turns in place', async () => {
    await observeClaudeReplay(aClaudeCrossing(), Response.json({ content: cachedContent }));
    await observeClaudeReplay(aClaudeCrossing(), Response.json({ id: 'msg_1' }));

    expect(prepareClaudeReplay(aClaudeCrossing(), aCompactedBody())).toHaveProperty(
      'messages.1.content',
      cachedContent,
    );
  });

  test('an error answer never contributes turns', async () => {
    await observeClaudeReplay(
      aClaudeCrossing(),
      Response.json({ content: cachedContent }, { status: 500 }),
    );

    expect(prepareClaudeReplay(aClaudeCrossing(), aCompactedBody())).toEqual(aCompactedBody());
  });

  test('a streamed answer keeps its headers while observed', async () => {
    const observed = await observeClaudeReplay(
      aClaudeCrossing(),
      anEventStream('data: {"type":"message_start"}\n\n'),
    );

    expect(observed.headers.get('content-type')).toBe('text/event-stream');

    await observed.text();
  });
});

describe('observeClaudeReplay: a replayed request that fails upstream', () => {
  test('drops the cached thinking so the next request is not replayed again', async () => {
    await observeClaudeReplay(aClaudeCrossing(), Response.json({ content: cachedContent }));
    const replayed = aClaudeCrossing();

    expect(prepareClaudeReplay(replayed, aCompactedBody())).toHaveProperty(
      'messages.1.content',
      cachedContent,
    );

    const failed = await observeClaudeReplay(replayed, anEventStream('data: {"type":"error"}\n\n'));

    await failed.text();

    expect(prepareClaudeReplay(aClaudeCrossing(), aCompactedBody())).toEqual(aCompactedBody());
  });

  test('a rejection clears only a replay that was actually applied', async () => {
    await observeClaudeReplay(aClaudeCrossing(), Response.json({ content: cachedContent }));
    const unmatched = aClaudeCrossing();

    prepareClaudeReplay(unmatched, { messages: [{ role: 'user', content: 'hello' }] });
    await observeClaudeReplay(unmatched, Response.json({ error: {} }, { status: 400 }));

    expect(prepareClaudeReplay(aClaudeCrossing(), aCompactedBody())).toHaveProperty(
      'messages.1.content',
      cachedContent,
    );
  });

  test('an abandoned stream leaves earlier turns held', async () => {
    await observeClaudeReplay(aClaudeCrossing(), Response.json({ content: cachedContent }));
    const replayed = aClaudeCrossing();

    prepareClaudeReplay(replayed, aCompactedBody());

    const answer = await observeClaudeReplay(
      replayed,
      anEventStream(
        'data: {"type":"message_start"}\n\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"future_delta"}}\n\ndata: {"type":"message_stop"}\n\n',
      ),
    );

    await answer.text();

    expect(prepareClaudeReplay(aClaudeCrossing(), aCompactedBody())).toHaveProperty(
      'messages.1.content',
      cachedContent,
    );
  });

  test('an errored stream leaves turns held for a request that was not replayed', async () => {
    await observeClaudeReplay(aClaudeCrossing(), Response.json({ content: cachedContent }));
    const fresh = aClaudeCrossing();

    const answer = await observeClaudeReplay(fresh, anEventStream('data: {"type":"error"}\n\n'));

    await answer.text();

    expect(prepareClaudeReplay(aClaudeCrossing(), aCompactedBody())).toHaveProperty(
      'messages.1.content',
      cachedContent,
    );
  });
});

describe('clearing the runtime cache', () => {
  test('clearing the cache forgets every held turn', async () => {
    await observeClaudeReplay(aClaudeCrossing(), Response.json({ content: cachedContent }));
    clearClaudeReplayCache();

    expect(prepareClaudeReplay(aClaudeCrossing(), aCompactedBody())).toEqual(aCompactedBody());
  });
});

describe('observeClaudeReplay: a final answer without signed thinking', () => {
  test('drops the held turns so stale reasoning never replays forward', async () => {
    await observeClaudeReplay(aClaudeCrossing(), Response.json({ content: cachedContent }));
    await observeClaudeReplay(
      aClaudeCrossing(),
      Response.json({ content: [{ type: 'text', text: 'done' }] }),
    );

    expect(prepareClaudeReplay(aClaudeCrossing(), aCompactedBody())).toEqual(aCompactedBody());
  });
});
