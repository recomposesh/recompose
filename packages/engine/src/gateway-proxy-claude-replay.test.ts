import { beforeEach, expect, test } from 'vitest';

import { createGatewayApp } from './gateway-app';
import { aGatewayHolding, aVirtualModel } from './gateway-app.testkit';
import { isJsonObject, parsedJson } from './gateway-wire';
import { clearClaudeReplayCache } from './provider/claude-replay-runtime';

const grant = {
  verdict: 'resolved',
  providerOrigin: 'https://api.anthropic.com',
  spend: {
    custody: 'credentialed',
    provider: 'anthropic',
    credential: 'anthropic-replay-credential',
    accountId: 'anthropic-replay-account',
    isCompat: true,
  },
} as const;

const cachedContent = [
  { type: 'thinking', thinking: 'full reasoning', signature: 'claude-signature' },
  { type: 'text', text: 'I will inspect the file.' },
  { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { path: 'README.md' } },
];

const compactedMessages = [
  { role: 'user', content: 'inspect' },
  {
    role: 'assistant',
    content: [
      { type: 'text', text: 'I will inspect the file.' },
      { type: 'tool_use', id: 'toolu_1', name: 'Read', input: { path: 'README.md' } },
    ],
  },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'ok' }] },
];

const streamCompactedMessages = [
  { role: 'user', content: 'inspect' },
  {
    role: 'assistant',
    content: [{ type: 'tool_use', id: 'toolu_1', name: 'Read', input: { path: 'README.md' } }],
  },
  { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'ok' }] },
];

function answer(content: unknown[] = [{ type: 'text', text: 'done' }]): Response {
  return Response.json({
    id: 'msg_1',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4-5',
    content,
    stop_reason: 'end_turn',
    usage: { input_tokens: 1, output_tokens: 1 },
  });
}

function bodyOf(init: RequestInit | undefined) {
  const value = typeof init?.body === 'string' ? parsedJson(init.body) : undefined;

  return isJsonObject(value) ? value : {};
}

function replayApp(responses: Response[]) {
  const bodies: Record<string, unknown>[] = [];
  const fetchLike: typeof fetch = async (_input, init) => {
    bodies.push(bodyOf(init));

    return Promise.resolve(responses.shift() ?? answer());
  };
  const app = createGatewayApp(
    aGatewayHolding(
      aVirtualModel({
        id: 'deep',
        target: { standing: 'bound', providerModel: 'claude-sonnet-4-5(high)' },
      }),
      aVirtualModel({
        id: 'flat',
        target: { standing: 'bound', providerModel: 'claude-sonnet-4-5' },
      }),
    ),
    async () => Promise.resolve(grant),
    fetchLike,
  );

  return { app, bodies };
}

async function ask(
  app: ReturnType<typeof createGatewayApp>,
  model: string,
  stream = false,
  messages?: unknown[],
): Promise<Response> {
  return app.request('http://127.0.0.1:8397/v1/messages', {
    method: 'POST',
    headers: { authorization: 'Bearer replay-caller', 'x-session-id': 'suffix-switch' },
    body: JSON.stringify({
      model,
      max_tokens: 32,
      ...(stream ? { stream: true } : {}),
      messages:
        messages ?? (model === 'deep' ? [{ role: 'user', content: 'inspect' }] : compactedMessages),
    }),
  });
}

function streamAnswer(events: unknown[]): Response {
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');

  return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
}

function completedThinkingStream(): Response {
  return streamAnswer([
    { type: 'message_start', message: { id: 'msg_1', model: 'claude-sonnet-4-5' } },
    { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } },
    {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'thinking_delta', thinking: 'stream reasoning' },
    },
    {
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'signature_delta', signature: 'stream-signature' },
    },
    { type: 'content_block_stop', index: 0 },
    {
      type: 'content_block_start',
      index: 1,
      content_block: { type: 'tool_use', id: 'toolu_1', name: 'Read', input: {} },
    },
    {
      type: 'content_block_delta',
      index: 1,
      delta: { type: 'input_json_delta', partial_json: '{"path":"README.md"}' },
    },
    { type: 'content_block_stop', index: 1 },
    { type: 'message_stop' },
  ]);
}

beforeEach(() => {
  clearClaudeReplayCache();
});

test('replays signed Claude thinking across reasoning suffix variants', async () => {
  const { app, bodies } = replayApp([answer(cachedContent), answer()]);

  await ask(app, 'deep');
  await ask(app, 'flat');

  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toHaveProperty('messages.1.content', cachedContent);
});

test.each([400, 422])(
  'clears an applied Claude replay after upstream status %s',
  async (status) => {
    const rejection = Response.json({ error: { message: 'invalid replay' } }, { status });
    const { app, bodies } = replayApp([answer(cachedContent), rejection, answer()]);

    await ask(app, 'deep');
    await ask(app, 'flat');
    await ask(app, 'flat');

    expect(bodies[1]).toHaveProperty('messages.1.content.0.signature', 'claude-signature');
    expect(bodies[2]).not.toHaveProperty('messages.1.content.0.signature');
  },
);

test('preserves an applied Claude replay after an upstream server error', async () => {
  const rejection = Response.json({ error: { message: 'server failed' } }, { status: 500 });
  const { app, bodies } = replayApp([answer(cachedContent), rejection, answer()]);

  await ask(app, 'deep');
  await ask(app, 'flat');
  await ask(app, 'flat');

  expect(bodies[1]).toHaveProperty('messages.1.content.0.signature', 'claude-signature');
  expect(bodies[2]).toHaveProperty('messages.1.content.0.signature', 'claude-signature');
});

test('replays Claude thinking captured from a completed stream', async () => {
  const { app, bodies } = replayApp([completedThinkingStream(), completedThinkingStream()]);

  await (await ask(app, 'deep', true)).text();
  await (await ask(app, 'flat', true, streamCompactedMessages)).text();

  expect(bodies[1]).toHaveProperty('messages.1.content.0.thinking', 'stream reasoning');
  expect(bodies[1]).toHaveProperty('messages.1.content.0.signature', 'stream-signature');
  expect(bodies[1]).toHaveProperty('messages.1.content.1.input.path', 'README.md');
});

test('isolates Claude replay between sessions', async () => {
  const { app, bodies } = replayApp([answer(cachedContent), answer()]);

  await ask(app, 'deep');
  await app.request('http://127.0.0.1:8397/v1/messages', {
    method: 'POST',
    headers: { authorization: 'Bearer replay-caller', 'x-session-id': 'another-session' },
    body: JSON.stringify({ model: 'flat', max_tokens: 32, messages: compactedMessages }),
  });

  expect(bodies[1]).not.toHaveProperty('messages.1.content.0.signature');
});
