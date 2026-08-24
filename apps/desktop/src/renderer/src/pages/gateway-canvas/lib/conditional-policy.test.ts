import { describe, expect, test } from 'vitest';

import { bornConditionalPolicy } from './conditional-policy';

describe('the policy a conditional router is born under', () => {
  test('re-judges every request, so a conversation that changes topic changes branch', () => {
    expect(bornConditionalPolicy('judge-node', 'else-node').rejudgeEveryRequest).toBe(true);
  });

  test('waits half a minute on its judge, which a slow channel can still answer inside', () => {
    expect(bornConditionalPolicy('judge-node', 'else-node').judgeBoundMs).toBe(30_000);
  });

  test('names its judge and its else child, and holds no branch yet', () => {
    expect(bornConditionalPolicy('judge-node', 'else-node')).toEqual({
      mode: 'conditional',
      judge: 'judge-node',
      branches: [],
      elseChild: 'else-node',
      judgeBoundMs: 30_000,
      rejudgeEveryRequest: true,
    });
  });
});
