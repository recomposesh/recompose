import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

import type { SubscriptionWireFetch } from './provider-transport';

import { sendSubscriptionRequest } from './provider-transport';
import { requestTo, streamOf } from './provider-transport.testkit';

const CLAUDE_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const CODEX_RESPONSES_URL = 'https://chatgpt.com/backend-api/codex/responses';

function answeringWith(
  headers: [string, string][],
  body: string | Uint8Array,
): SubscriptionWireFetch {
  return async () => {
    await Promise.resolve();

    return { status: 200, headers, body: streamOf(body) };
  };
}

describe('the shape a subscription answer reaches its caller in', () => {
  it('should hand a compressed Claude answer back as the plain text it encodes', async () => {
    const payload = '{"content":[{"type":"text","text":"an answer"}]}';
    const wire = answeringWith(
      [
        ['content-type', 'application/json'],
        ['content-encoding', 'gzip'],
      ],
      gzipSync(payload),
    );

    const response = await sendSubscriptionRequest(
      'anthropic',
      requestTo(CLAUDE_MESSAGES_URL),
      wire,
    );

    await expect(response.json()).resolves.toEqual(JSON.parse(payload));
    expect(response.headers.has('content-encoding')).toBe(false);
  });

  it('should leave a tool name alone in an answer a provider other than Claude sent', async () => {
    const payload = '{"content":[{"type":"tool_use","id":"one","name":"mcp__server__search"}]}';
    const wire = answeringWith(
      [
        ['content-type', 'application/json'],
        ['content-length', String(payload.length)],
      ],
      payload,
    );

    const response = await sendSubscriptionRequest(
      'openai',
      {
        ...requestTo(CODEX_RESPONSES_URL),
        reverseToolNames: { mcp__server__search: 'Search_Web' },
      },
      wire,
    );

    expect(response.headers.get('content-length')).toBe(String(payload.length));
    await expect(response.text()).resolves.toBe(payload);
  });

  it('should carry the reason phrase the upstream refused with', async () => {
    const wire: SubscriptionWireFetch = async () => {
      await Promise.resolve();

      return { status: 429, statusText: 'Too Many Requests', headers: [], body: null };
    };

    const response = await sendSubscriptionRequest('openai', requestTo(CODEX_RESPONSES_URL), wire);

    expect(response.status).toBe(429);
    expect(response.statusText).toBe('Too Many Requests');
  });
});
