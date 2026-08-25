import { expect, test } from 'vitest';

import { catalogEntries, signInProviderOf } from '../../../entities/provider';

test('every entry the catalog offers resolves its connect arm without throwing', () => {
  for (const entry of catalogEntries) {
    expect(() => signInProviderOf(entry), entry.id).not.toThrow();
  }
});
