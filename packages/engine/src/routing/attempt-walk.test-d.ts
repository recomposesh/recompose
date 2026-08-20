import { describe, expectTypeOf, test } from 'vitest';

import type { WalkRequest } from './attempt-walk';
import type { JudgedRequest } from './judge-decision';

describe('what a walk asks its caller for about judging', () => {
  test('one judged object stands where three separate fields stood', () => {
    expectTypeOf<WalkRequest<string>>().toHaveProperty('judged').toEqualTypeOf<JudgedRequest>();
  });

  test('a caller cannot wire the classifier without somewhere to keep the branch', () => {
    expectTypeOf<keyof WalkRequest<string>>().toEqualTypeOf<
      | 'attempt'
      | 'cursors'
      | 'judged'
      | 'ledger'
      | 'now'
      | 'resumesServerState'
      | 'routing'
      | 'slug'
      | 'virtualModel'
    >();
  });
});
