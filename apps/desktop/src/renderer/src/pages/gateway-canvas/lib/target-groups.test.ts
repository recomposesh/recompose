import type { AccountsDocument } from '@recompose/contracts';

import { expect, test } from 'vitest';

import { targetGroups } from './target-groups';

type StoredAccounts = AccountsDocument['accounts'];

const everyKind: StoredAccounts = [
  { id: 's1', provider: 'anthropic', kind: 'subscription', provenance: 'sign-in', label: 'Claude' },
  { id: 'k1', provider: 'anthropic', kind: 'api-key', label: 'Work key', credentialRef: 'c1' },
  { id: 'g1', provider: 'openrouter', kind: 'aggregator', label: 'Router', credentialRef: 'c2' },
  { id: 'l1', provider: 'ollama', kind: 'local', address: 'http://127.0.0.1:11434' },
];

test('the offered accounts stand under the kinds the registry holds them as', () => {
  expect(targetGroups(everyKind).map((group) => group.heading)).toEqual([
    'Subscriptions',
    'API keys',
    'Aggregators',
    'Local runtimes',
  ]);
});

test('a subscription account reads by its product, with the identity under it', () => {
  const [subscriptions] = targetGroups(everyKind);

  expect(subscriptions).toEqual({
    heading: 'Subscriptions',
    options: [{ id: 's1', name: 'Claude', detail: 'Claude', mark: 'anthropic' }],
  });
});

test('a kind holding nothing that can be a target stands as no group at all', () => {
  const keysOnly = everyKind.filter((account) => account.kind === 'api-key');

  expect(targetGroups(keysOnly).map((group) => group.heading)).toEqual(['API keys']);
});

test('a stored key reads by its vendor product, with the name a person filed it under below', () => {
  const keys = targetGroups(everyKind)[1];

  expect(keys?.options).toEqual([
    { id: 'k1', name: 'Anthropic', detail: 'Work key', mark: 'anthropic' },
  ]);
});

test('a stored runtime offers only the server name and its mark', () => {
  const runtimes = targetGroups(everyKind).at(-1);

  expect(runtimes?.options).toEqual([
    { id: 'l1', name: 'Ollama', detail: 'http://127.0.0.1:11434', mark: 'ollama' },
  ]);
});

test('a registry holding nothing offers no group for anyone to search', () => {
  expect(targetGroups([])).toEqual([]);
});

test('a key held under a vendor recompose draws no mark for offers the name alone', () => {
  const unmarked: StoredAccounts = [
    { id: 'k2', provider: 'in-house', kind: 'api-key', label: 'House key', credentialRef: 'c3' },
  ];

  expect(targetGroups(unmarked)[0]?.options).toEqual([
    { id: 'k2', name: 'in-house', detail: 'House key' },
  ]);
});
