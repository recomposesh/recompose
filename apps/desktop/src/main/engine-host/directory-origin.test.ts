import type { Account } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { providerOriginOf } from './provider-origin';

function keyRow(provider: string): Account {
  return {
    id: `acc-${provider}`,
    provider,
    kind: 'api-key',
    label: provider,
    credentialRef: 'cred-1',
  };
}

function ownRow(origin: string): Account {
  return {
    id: 'acc-mine',
    provider: 'my-own-server',
    kind: 'api-key',
    label: 'Mine',
    credentialRef: 'cred-1',
    endpoint: { origin, dialect: 'chat-completions' },
  };
}

describe('where a key the directory names is spent', () => {
  const aggregatorTable: [string, string][] = [
    ['together', 'https://api.together.ai'],
    ['fireworks', 'https://api.fireworks.ai/inference'],
    ['groq', 'https://api.groq.com/openai'],
    ['deepinfra', 'https://api.deepinfra.com/v1/openai'],
    ['cerebras', 'https://api.cerebras.ai'],
  ];

  test.each(aggregatorTable)('%s is spent at the endpoint it documents', (provider, origin) => {
    expect(providerOriginOf(keyRow(provider))).toBe(origin);
  });

  const keyTable: [string, string][] = [
    ['mistral', 'https://api.mistral.ai'],
    ['deepseek', 'https://api.deepseek.com'],
    ['moonshot', 'https://api.moonshot.ai'],
    ['qwen', 'https://dashscope.aliyuncs.com/compatible-mode'],
    ['xai', 'https://api.x.ai/v1'],
  ];

  test.each(keyTable)('%s is spent at the endpoint it documents', (provider, origin) => {
    expect(providerOriginOf(keyRow(provider))).toBe(origin);
  });

  const planTable: [string, string][] = [
    ['zhipu', 'https://api.z.ai/api/anthropic'],
    ['qwen-coding', 'https://coding.dashscope.aliyuncs.com/apps/anthropic'],
    ['minimax', 'https://api.minimax.io/anthropic'],
  ];

  test.each(planTable)('the %s plan is spent at its plan endpoint', (provider, origin) => {
    expect(providerOriginOf(keyRow(provider))).toBe(origin);
  });
});

describe('where a key nobody but the person placed is spent', () => {
  test('a row carrying its own endpoint is spent at the address it carries', () => {
    expect(providerOriginOf(ownRow('https://models.example.com'))).toBe(
      'https://models.example.com',
    );
  });

  test("a row's own endpoint outranks the plugin scheme the fallback would mint", () => {
    expect(providerOriginOf(ownRow('https://models.example.com'))).not.toContain('plugin://');
  });

  test('a row under a provider the directory never named still falls to the plugin scheme', () => {
    expect(providerOriginOf(keyRow('some-plugin'))).toBe('plugin://some-plugin');
  });
});
