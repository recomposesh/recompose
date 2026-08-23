import { expect, test } from 'vitest';

import { accountFaceOf, accountLabelOf } from './account-labels';

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

test('a stored account faces with its product, its name, and the mark its vendor draws', () => {
  const face = accountFaceOf(
    {
      accounts: [
        {
          id: 'work',
          kind: 'subscription',
          provider: 'anthropic',
          label: 'dev@example.com',
          provenance: 'sign-in',
        },
      ],
    },
    'work',
  );

  expect(face).toEqual({ name: 'dev@example.com', product: 'Claude', mark: 'anthropic' });
});

test('an account the registry no longer holds faces with the id its buckets kept', () => {
  const face = accountFaceOf({ accounts: [] }, 'departed');

  expect(face).toEqual({ name: 'departed', product: undefined, mark: undefined });
});
