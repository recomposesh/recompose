import type { Account } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import { spokenNameOf, targetNameIn } from './binding-acts';

const stored: readonly Account[] = [
  { id: 'k1', provider: 'anthropic', kind: 'api-key', label: 'work', credentialRef: 'c1' },
  { id: 'l1', provider: 'ollama', kind: 'local', address: 'http://127.0.0.1:11434' },
];

describe('the name a definition answers to out loud', () => {
  test('a named definition is spoken by its name', () => {
    expect(
      spokenNameOf({ displayName: 'Fast', id: 'fast', accountId: 'k1', providerModel: 'haiku' }),
    ).toBe('Fast');
  });

  test('a definition nobody named is spoken by the id clients send it', () => {
    expect(
      spokenNameOf({ displayName: '', id: 'steady', accountId: 'k1', providerModel: 'haiku' }),
    ).toBe('steady');
  });
});

describe('the name a target account reads as', () => {
  test('a stored account reads as the name a person gave it', () => {
    expect(targetNameIn(stored, 'k1')).toBe('work');
  });

  test('an account with no label of its own reads as what it is', () => {
    expect(targetNameIn(stored, 'l1')).toBe('Ollama');
  });

  test('an account that left the registry reads as its bare id, never as nothing', () => {
    expect(targetNameIn(stored, 'g1')).toBe('g1');
  });
});
