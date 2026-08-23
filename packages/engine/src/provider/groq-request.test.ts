import { describe, expect, test } from 'vitest';

import type { Crossing } from '../gateway-wire';

import { aCrossing } from '../gateway-stream-commit.testkit';
import { credentialedRequestBody } from './credentialed-target';
import { groqProviderBody } from './groq-request';

describe('the turn Groq will take', () => {
  test('a system message carrying a cache breakpoint loses only the breakpoint', () => {
    expect(
      groqProviderBody({
        model: 'llama-3.3-70b',
        messages: [
          { role: 'system', content: 'rules', cache_control: { type: 'ephemeral' } },
          { role: 'user', content: 'hello' },
        ],
      }),
    ).toEqual({
      model: 'llama-3.3-70b',
      messages: [
        { role: 'system', content: 'rules' },
        { role: 'user', content: 'hello' },
      ],
    });
  });

  test('a breakpoint on a content part inside a message comes off too', () => {
    expect(
      groqProviderBody({
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'hello', cache_control: { type: 'ephemeral' } }],
          },
        ],
      }),
    ).toEqual({ messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }] });
  });

  test('a breakpoint declared on a tool comes off as well', () => {
    expect(
      groqProviderBody({
        tools: [{ name: 'search', cache_control: { type: 'ephemeral', ttl: '1h' } }],
      }),
    ).toEqual({ tools: [{ name: 'search' }] });
  });

  test('a turn carrying no breakpoint is handed over unchanged', () => {
    const body = { model: 'llama-3.3-70b', messages: [{ role: 'user', content: 'hello' }] };

    expect(groqProviderBody(body)).toEqual(body);
  });

  test('a field merely named like the breakpoint inside a string is untouched', () => {
    expect(groqProviderBody({ messages: [{ role: 'user', content: 'cache_control' }] })).toEqual({
      messages: [{ role: 'user', content: 'cache_control' }],
    });
  });
});

describe('the fields Groq answers a turn with a refusal over', () => {
  const groqSpend = {
    custody: 'credentialed' as const,
    provider: 'groq',
    credential: 'gsk-test',
    accountId: 'account-1',
  };

  const groqGrant = {
    verdict: 'resolved' as const,
    providerOrigin: 'https://api.groq.com/openai',
    spend: groqSpend,
  };

  function crossingFor(sessionId: string): Crossing {
    return {
      ...aCrossing(),
      dialect: 'chat-completions',
      providerModel: 'llama-3.3-70b',
      sessionId,
    };
  }

  test('the prompt cache key this gateway stamps never reaches Groq', () => {
    const body = credentialedRequestBody(groqGrant, crossingFor('session-1'), {
      model: 'llama-3.3-70b',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(body['prompt_cache_key']).toBeUndefined();
  });

  test('a vendor that reads the key still carries it', () => {
    const openrouter = { ...groqGrant, spend: { ...groqSpend, provider: 'openrouter' } };
    const body = credentialedRequestBody(openrouter, crossingFor('session-1'), {
      model: 'some-model',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(body['prompt_cache_key']).toBe('chat-completions:llama-3.3-70b:session-1');
  });

  test('the cache breakpoint comes off in the same turn the key stays off', () => {
    const body = credentialedRequestBody(groqGrant, crossingFor('session-1'), {
      model: 'llama-3.3-70b',
      messages: [{ role: 'system', content: 'rules', cache_control: { type: 'ephemeral' } }],
    });

    expect(JSON.stringify(body)).not.toContain('cache_control');
    expect(body['prompt_cache_key']).toBeUndefined();
  });
});
