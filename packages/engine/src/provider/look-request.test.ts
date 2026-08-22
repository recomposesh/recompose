import { describe, expect, test } from 'vitest';

import { authHeadersFor, lookHeadersFor, modelsPathFor } from './look-request';

const aKey = 'sk-ant-api03-1f2e3d4c';

type StoredProviderLook = { headersFor(provider: string, key: string): Record<string, string> };

describe('how a look spells the credential it was handed', () => {
  test('a runtime on this machine carries none', () => {
    expect(lookHeadersFor({ custody: 'open' })).toStrictEqual({});
  });

  test('a first-party key rides the header its own vendor reads', () => {
    expect(
      lookHeadersFor({ custody: 'provider-key', provider: 'anthropic', credential: aKey }),
    ).toStrictEqual({ 'x-api-key': aKey, 'anthropic-version': '2023-06-01' });
  });

  test('every other pasted key rides the OpenAI-compatible bearer', () => {
    expect(
      lookHeadersFor({ custody: 'bearer', provider: 'deepseek', credential: aKey }),
    ).toStrictEqual({ Authorization: `Bearer ${aKey}` });
  });
});

describe('the catalog path a look asks at', () => {
  test('Gemini publishes its catalog under its own version segment', () => {
    expect(modelsPathFor({ custody: 'provider-key', provider: 'gemini', credential: aKey })).toBe(
      '/v1beta/models',
    );
  });

  test('a vendor with no header of its own answers the OpenAI-compatible catalog', () => {
    expect(modelsPathFor({ custody: 'bearer', provider: 'deepseek', credential: aKey })).toBe(
      '/v1/models',
    );
  });
});

describe('a provider name no first-party header answers', () => {
  test('a stored provider name no vendor answers is refused by name', () => {
    const stored: StoredProviderLook = { headersFor: authHeadersFor };

    expect(() => stored.headersFor('mistral', aKey)).toThrow(
      'no look speaks to the provider: mistral',
    );
  });

  test('the refusal names the provider it was handed, whatever it was', () => {
    const stored: StoredProviderLook = { headersFor: authHeadersFor };

    expect(() => stored.headersFor('anthropic-legacy', aKey)).toThrow('anthropic-legacy');
  });
});

describe('a look at a Copilot plan catalog', () => {
  const copilotPlan = {
    custody: 'subscription' as const,
    provider: 'copilot' as const,
    accountId: 'account-1',
    credential: 'tid=abc;exp=1787430000',
    renewal: 'app' as const,
  };

  test('asks the catalog Copilot publishes, which carries no version segment', () => {
    expect(modelsPathFor(copilotPlan)).toBe('/models');
  });

  test('names the editor Copilot serves rather than carrying a bare bearer', () => {
    expect(lookHeadersFor(copilotPlan)).toMatchObject({
      authorization: 'Bearer tid=abc;exp=1787430000',
      'copilot-integration-id': 'vscode-chat',
      'x-github-api-version': '2025-10-01',
    });
  });

  test('every other plan keeps the compatible catalog and the bare bearer', () => {
    const kimiPlan = { ...copilotPlan, provider: 'kimi' as const, credential: 'kimi-access' };

    expect(modelsPathFor(kimiPlan)).toBe('/v1/models');
    expect(lookHeadersFor(kimiPlan)).toStrictEqual({ Authorization: 'Bearer kimi-access' });
  });
});
