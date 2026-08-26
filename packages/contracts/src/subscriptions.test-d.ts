import { describe, expectTypeOf, test } from 'vitest';

import type {
  BothWaysProviderId,
  BrowserSignInProviderId,
  ToolBackedProviderId,
} from './subscriptions';

describe('the plans reachable both through a tool and through recompose itself', () => {
  test('the set is exactly the plans standing in both tables', () => {
    expectTypeOf<BothWaysProviderId>().toEqualTypeOf<'openai'>();
  });

  test('a plan only a tool signs into never satisfies the two-way type', () => {
    expectTypeOf<'anthropic'>().not.toExtend<BothWaysProviderId>();
  });

  test('a plan only recompose signs into never satisfies the two-way type', () => {
    expectTypeOf<'antigravity'>().not.toExtend<BothWaysProviderId>();
  });

  test('a two-way plan is accepted wherever either single channel is taken', () => {
    expectTypeOf<BothWaysProviderId>().toExtend<ToolBackedProviderId>();
    expectTypeOf<BothWaysProviderId>().toExtend<BrowserSignInProviderId>();
  });
});
