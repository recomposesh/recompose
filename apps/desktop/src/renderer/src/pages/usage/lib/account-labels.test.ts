import { expect, test } from 'vitest';

import { accountLabelOf } from './account-labels';

const registry = {
  accounts: [{ id: 'build', label: 'build key' }, { id: 'loopback' }],
};

test('an account the registry knows reads by the name a person gave it', () => {
  expect(accountLabelOf(registry, 'build')).toBe('build key');
});

test('an account carrying no name of its own reads by its id rather than as blank', () => {
  expect(accountLabelOf(registry, 'loopback')).toBe('loopback');
});

test('an account the registry never held reads by its id, which is all a bucket kept', () => {
  expect(accountLabelOf(registry, 'forgotten')).toBe('forgotten');
});

test('a registry that has not answered yet still names every account it is asked about', () => {
  expect(accountLabelOf(undefined, 'build')).toBe('build');
});

test('a name that is not text reads by the id rather than by a malformed record', () => {
  const malformedRegistry = { accounts: [{ id: 'build', label: 7 }] };

  expect(accountLabelOf(malformedRegistry, 'build')).toBe('build');
});
