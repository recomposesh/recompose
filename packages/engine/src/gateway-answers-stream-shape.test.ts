import { Hono } from 'hono';
import { afterEach, describe, expect, test } from 'vitest';

import type { RunningOrigin } from './gateway-app.testkit';

import { createGatewayApp } from './gateway-app';
import {
  aCredentialedGrant,
  aGatewayHolding,
  aVirtualModel,
  granting,
  neverFetches,
  servedOrigin,
} from './gateway-app.testkit';
import {
  codexCredential,
  runtimeAnswering,
  subscriptionGrant,
  subscriptionModel,
} from './gateway-proxy-subscription.testkit';
import { CodexReasoningReplay } from './subscription/codex-replay';

const aStreamingAsk = {
  model: 'fast',
  max_tokens: 1024,
  stream: true,
  messages: [{ role: 'user', content: 'hello' }],
};

const aCompletedResponsesAnswer = {
  id: 'resp_1',
  object: 'response',
  model: 'gpt-5.6-sol',
  status: 'completed',
  output: [
    {
      id: 'msg_1',
      type: 'message',
      role: 'assistant',
      status: 'completed',
      content: [{ type: 'output_text', text: 'Hello', annotations: [] }],
    },
  ],
  usage: { input_tokens: 5, output_tokens: 1 },
};

function aCodexSubscriptionGateway(upstream: () => Response): Hono {
  const grants = granting(subscriptionGrant('openai', codexCredential()));
  const provider = runtimeAnswering(upstream);

  return createGatewayApp(aGatewayHolding(subscriptionModel), grants.grantFor, neverFetches, {
    ...provider.runtime,
    codexReplay: new CodexReasoningReplay(),
  });
}

function aChatCompletionsProvider(): Hono {
  const provider = new Hono();

  provider.post('/v1/chat/completions', (c) =>
    c.json({
      id: 'chatcmpl-1',
      choices: [
        { index: 0, message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' },
      ],
    }),
  );

  return provider;
}

function aCompletedResponsesEvent(): string {
  return `data: ${JSON.stringify({
    type: 'response.completed',
    response: aCompletedResponsesAnswer,
  })}\n\n`;
}

async function askedThroughGateway(app: Hono, ask: unknown = aStreamingAsk): Promise<Response> {
  return app.request('http://127.0.0.1:8397/v1/messages', {
    method: 'POST',
    body: JSON.stringify(ask),
  });
}

let running: RunningOrigin | undefined;

afterEach(async () => {
  await running?.close();
  running = undefined;
});

describe('a caller that asked the gateway to stream', () => {
  test('given a Codex target answering without a stream, the answer arrives as Anthropic events', async () => {
    const app = aCodexSubscriptionGateway(
      () =>
        new Response(JSON.stringify(aCompletedResponsesAnswer), {
          headers: { 'content-type': 'application/json' },
        }),
    );

    const answer = await askedThroughGateway(app);
    const events = await answer.text();

    expect(answer.status).toBe(200);
    expect(answer.headers.get('content-type')).toContain('text/event-stream');
    expect(events).toContain('event: message_start');
    expect(events).toContain('event: message_stop');
    expect(events).toContain('Hello');
  });

  test('given a Codex target labelling its stream loosely, the answer crosses into the caller dialect', async () => {
    const app = aCodexSubscriptionGateway(
      () => new Response(aCompletedResponsesEvent(), { headers: { 'content-type': 'text/plain' } }),
    );

    const answer = await askedThroughGateway(app);
    const events = await answer.text();

    expect(answer.status).toBe(200);
    expect(events).toContain('event: message_start');
    expect(events).not.toContain('response.completed');
  });

  test('given a target answer carrying no readable message, the gateway refuses rather than answering empty', async () => {
    const app = aCodexSubscriptionGateway(
      () =>
        new Response('not a model answer at all', { headers: { 'content-type': 'text/plain' } }),
    );

    const answer = await askedThroughGateway(app);
    const body: unknown = await answer.json();

    expect(answer.status).toBe(502);
    expect(body).toEqual({
      type: 'error',
      error: {
        type: 'api_error',
        message:
          'The gateway "Codex" could not stream the answer that the target "claude-sonnet-4-5" returned for the virtual model "fast".',
      },
    });
  });
});

describe('a caller that asked a chat-completions target to stream', () => {
  test('given a target answering without a stream, the answer arrives as Anthropic events', async () => {
    running = await servedOrigin(aChatCompletionsProvider());

    const app = createGatewayApp(aGatewayHolding(aVirtualModel()), async () =>
      Promise.resolve(aCredentialedGrant(running?.origin)),
    );

    const answer = await askedThroughGateway(app);
    const events = await answer.text();

    expect(answer.status).toBe(200);
    expect(answer.headers.get('content-type')).toContain('text/event-stream');
    expect(events).toContain('event: message_start');
    expect(events).toContain('event: message_stop');
  });
});

describe('a caller that did not ask the gateway to stream', () => {
  test('given a Codex target that only streams, the answer arrives as one JSON message', async () => {
    const app = aCodexSubscriptionGateway(
      () =>
        new Response(aCompletedResponsesEvent(), {
          headers: { 'content-type': 'text/event-stream' },
        }),
    );

    const answer = await askedThroughGateway(app, { ...aStreamingAsk, stream: false });
    const body: unknown = await answer.json();

    expect(answer.headers.get('content-type')).toContain('application/json');
    expect(body).toMatchObject({ type: 'message', content: [{ type: 'text', text: 'Hello' }] });
  });
});
