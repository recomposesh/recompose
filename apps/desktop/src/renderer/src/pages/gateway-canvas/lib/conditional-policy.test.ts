import { describe, expect, test } from 'vitest';

import { bornConditionalPolicy } from './conditional-policy';

describe('the policy a conditional router is born under', () => {
  test('re-judges every request, so a conversation that changes topic changes branch', () => {
    expect(bornConditionalPolicy('judge-node', 'else-node').rejudgeEveryRequest).toBe(true);
  });

  test('names its judge and its else child, and holds no branch yet', () => {
    expect(bornConditionalPolicy('judge-node', 'else-node')).toEqual({
      mode: 'conditional',
      judge: 'judge-node',
      branches: [],
      elseChild: 'else-node',
      judgeBoundMs: 3000,
      rejudgeEveryRequest: true,
    });
  });
});
