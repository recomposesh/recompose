import { describe, expect, test } from 'vitest';

import type { createGatewayApp as CreateGatewayApp } from './gateway-app';

import { createGatewayApp } from './gateway-app';
import { aGatewayHolding, granting, neverFetches } from './gateway-app.testkit';
import {
  claudeAnswer,
  claudeCredential,
  runtimeAnswering,
  subscriptionGrant,
  subscriptionModel,
} from './gateway-proxy-subscription.testkit';

function claudeApp(runtime: Parameters<typeof CreateGatewayApp>[3]) {
  const grants = granting(
    subscriptionGrant('anthropic', claudeCredential('claude-access', 1_800_000_000_000)),
  );

  return createGatewayApp(
    aGatewayHolding(subscriptionModel),
    grants.grantFor,
    neverFetches,
    runtime,
  );
}

async function askedThrough(headers: Record<string, string>): Promise<Headers> {
  const provider = runtimeAnswering(() => claudeAnswer([{ type: 'text', text: 'ok' }]));

  await claudeApp(provider.runtime).request('http://127.0.0.1:8397/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: 'fast', messages: [{ role: 'user', content: 'hello' }] }),
  });

  return new Headers(provider.sent[0]?.request.headers ?? []);
}

describe('a subagent asking through a Claude plan', () => {
  test('names itself and its parent to Anthropic, which places the request by them', async () => {
    const sent = await askedThrough({
      'x-claude-code-agent-id': 'agent-7',
      'x-claude-code-parent-agent-id': 'agent-1',
    });

    expect(sent.get('x-claude-code-agent-id')).toBe('agent-7');
    expect(sent.get('x-claude-code-parent-agent-id')).toBe('agent-1');
  });

  test('a caller sending none of them leaves the wire exactly as it stood', async () => {
    const sent = await askedThrough({});

    expect(sent.get('x-claude-code-agent-id')).toBeNull();
    expect(sent.get('x-claude-code-session-id')).not.toBeNull();
  });

  test('the caller own credential never crosses, whatever it sent', async () => {
    const sent = await askedThrough({ authorization: 'Bearer caller-secret' });

    expect(sent.get('authorization')).toBe('Bearer claude-access');
  });
});
