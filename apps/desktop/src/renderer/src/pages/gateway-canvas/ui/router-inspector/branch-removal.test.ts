import { expect, test } from 'vitest';

import { branchRemovalQuestion } from './branch-removal';

test('the question names the branch a person asked to delete', () => {
  expect(branchRemovalQuestion('code').heading).toContain('code');
});

test('the body names the real cost, which is where the traffic goes next', () => {
  expect(branchRemovalQuestion('code').body).toContain('else');
});

test('the confirming act names itself rather than answering a bare yes', () => {
  expect(branchRemovalQuestion('code').confirmLabel).not.toBe('Yes');
  expect(branchRemovalQuestion('code').confirmLabel).toContain('Delete');
});

test('a branch nobody labelled is still asked about, in words that name no label', () => {
  const asked = branchRemovalQuestion(undefined);

  expect(asked.heading).not.toContain('undefined');
  expect(asked.body).toContain('else');
});
