import type { SpendGrant } from '@recompose/contracts';

import { afterEach, describe, expect, it } from 'vitest';

import type { PluginClient } from './plugin-abi';

import { createGatewayApp } from './gateway-app';
import { aGatewayHolding, aVirtualModel, neverFetches } from './gateway-app.testkit';
import { pluginMethods } from './plugin-abi';
import { PluginHost } from './plugin-host';
import { providerObservability } from './provider/provider-observability';

const grant: SpendGrant = {
  verdict: 'resolved',
  providerOrigin: 'plugin://plugin-provider',
  spend: {
    custody: 'credentialed',
    provider: 'plugin-provider',
    credential: '{"token":"plugin-secret"}',
    accountId: 'acc-plugin',
  },
};

function encoded(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

function answeringWithUsage(method: string): Uint8Array {
  if (method === pluginMethods.register) {
    return encoded({
      ok: true,
      result: {
        schema_version: 2,
        metadata: { name: 'plugin-executor' },
        capabilities: {
          executor: true,
          executor_model_scope: 'both',
          executor_input_formats: ['chat-completions', 'anthropic'],
          executor_output_formats: ['chat-completions'],
        },
      },
    });
  }

  if (method === 'executor.identifier') {
    return encoded({ ok: true, result: { identifier: 'plugin-provider' } });
  }

  return encoded({
    ok: true,
    result: {
      Payload: Buffer.from(
        JSON.stringify({
          id: 'chatcmpl_plugin',
          object: 'chat.completion',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'answered' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 11, completion_tokens: 4, total_tokens: 15 },
        }),
      ).toString('base64'),
    },
  });
}

async function askedThroughAPluginExecutor(): Promise<void> {
  const client: PluginClient = {
    call: async (method) => {
      await Promise.resolve();

      return answeringWithUsage(method);
    },
    shutdown: () => undefined,
  };
  const host = new PluginHost(() => client);

  await host.load('plugin-executor', '/plugin-executor');

  const app = createGatewayApp(
    aGatewayHolding(
      aVirtualModel({ target: { standing: 'bound', providerModel: 'plugin-model' } }),
    ),
    async () => Promise.resolve(grant),
    neverFetches,
    undefined,
    undefined,
    undefined,
    host,
  );

  await app.request('http://127.0.0.1:8397/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({ model: 'fast', messages: [{ role: 'user', content: 'hello' }] }),
  });
}

describe('a turn a plugin executor answered in full', () => {
  afterEach(() => {
    providerObservability().clear();
  });

  it('counts against the account it spent, the way every other turn does', async () => {
    await askedThroughAPluginExecutor();

    const observed = providerObservability().snapshot();

    expect(observed).toHaveLength(1);
    expect(observed[0]).toMatchObject({
      accountId: 'acc-plugin',
      provider: 'plugin-provider',
      usage: { inputTokens: 11, outputTokens: 4, totalTokens: 15 },
    });
  });
});
