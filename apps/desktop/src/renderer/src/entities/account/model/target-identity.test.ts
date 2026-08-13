import type { Account } from '@recompose/contracts';

import { expect, test } from 'vitest';

import { accountDetail, accountMark, accountName, accountProductName } from './target-identity';

const workKey: Account = {
  id: 'a1',
  provider: 'anthropic',
  kind: 'api-key',
  label: 'Work key',
  credentialRef: 'c-a1',
};

const runtime: Account = {
  id: 'a2',
  provider: 'ollama',
  kind: 'local',
  address: 'http://127.0.0.1:11434',
};

test('a stored key reads as the name the person filed it under', () => {
  expect(accountName(workKey)).toBe('Work key');
});

test('a stored runtime reads as the server it is, because nobody named it', () => {
  expect(accountName(runtime)).toBe('Ollama');
});

test('an account whose vendor recompose draws leads with that vendor mark', () => {
  expect(accountMark(workKey)).toBe('anthropic');
});

test('an account whose vendor recompose draws no mark for leads with nothing', () => {
  expect(accountMark({ ...workKey, provider: 'a-vendor-nobody-drew' })).toBeUndefined();
});

test('a subscription names the product a person connected', () => {
  expect(
    accountProductName({
      id: 'subscription',
      provider: 'anthropic',
      kind: 'subscription',
      provenance: 'sign-in',
      label: 'Claude Max',
    }),
  ).toBe('Claude');
});

test('the other target kinds name their provider product', () => {
  expect(accountProductName(workKey)).toBe('Anthropic');
  expect(
    accountProductName({
      id: 'aggregator',
      provider: 'openrouter',
      kind: 'aggregator',
      label: 'OpenRouter',
      credentialRef: 'c-aggregator',
    }),
  ).toBe('OpenRouter');
  expect(accountProductName(runtime)).toBe('Ollama');
});

test('the target detail reads the account identity appropriate to its kind', () => {
  expect(accountDetail(workKey)).toBe('Work key');
  expect(accountDetail(runtime)).toBe('http://127.0.0.1:11434');
  expect(
    accountDetail(
      {
        id: 'subscription',
        provider: 'openai',
        kind: 'subscription',
        provenance: 'sign-in',
        label: 'Codex account',
      },
      'ada@example.com',
    ),
  ).toBe('ada@example.com');
});

test('a subscription transport with a provider alias still leads with the provider mark', () => {
  expect(
    accountMark({
      id: 'antigravity',
      provider: 'antigravity',
      kind: 'subscription',
      provenance: 'sign-in',
      label: 'Gemini',
    }),
  ).toBe('gemini');
});
