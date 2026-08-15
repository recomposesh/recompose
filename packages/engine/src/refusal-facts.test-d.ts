import { describe, expectTypeOf, test } from 'vitest';

import type { ConfigFaultRefusal } from './refusal-facts';

describe('the family of refusals a person wired rather than a request asked for', () => {
  test('three reasons stand in it, and a fourth has to be admitted here first', () => {
    expectTypeOf<ConfigFaultRefusal['reason']>().toEqualTypeOf<
      'missing-target' | 'missing-credential' | 'unstreamable-answer'
    >();
  });
});
