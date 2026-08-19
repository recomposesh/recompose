import { fc, test as propertyTest } from '@fast-check/vitest';
import { describe, expect, test } from 'vitest';

import type { JudgeReading } from './outcome-classification';
import type { BranchRule } from './policies';

import { childOneReadingNames } from './judge-decision';

const ELSE_CHILD = 'catchall';

const BRANCHES: readonly BranchRule[] = [
  { label: 'code', rule: 'asks to write or change code', child: 'coder' },
  { label: 'chat', rule: 'small talk and questions', child: 'talker' },
];

const labelsArb = fc.uniqueArray(fc.string({ minLength: 1, maxLength: 5 }), { maxLength: 4 });

const readingArb: fc.Arbitrary<JudgeReading> = fc.oneof(
  fc.string().map((label) => ({ heard: 'answer' as const, label })),
  fc.constant<JudgeReading>({ heard: 'refusal' }),
  fc.constant<JudgeReading>({ heard: 'timeout' }),
);

function branchesWearing(labels: readonly string[]): readonly BranchRule[] {
  return labels.map((label) => ({ label, rule: `about ${label}`, child: `behind-${label}` }));
}

describe('the child one judge reading names', () => {
  test('a reading naming a branch label names the child behind that branch', () => {
    const reading: JudgeReading = { heard: 'answer', label: 'chat' };

    expect(childOneReadingNames(BRANCHES, ELSE_CHILD, reading)).toBe('talker');
  });

  test('a reading naming a label no branch wears names the else child', () => {
    const reading: JudgeReading = { heard: 'answer', label: 'weather' };

    expect(childOneReadingNames(BRANCHES, ELSE_CHILD, reading)).toBe(ELSE_CHILD);
  });

  test('every reading a judge can give names one child this router already holds', () => {
    const readings: readonly JudgeReading[] = [
      { heard: 'answer', label: 'code' },
      { heard: 'answer', label: 'weather' },
      { heard: 'answer', label: '' },
      { heard: 'refusal' },
      { heard: 'timeout' },
    ];

    expect(readings.map((reading) => childOneReadingNames(BRANCHES, ELSE_CHILD, reading))).toEqual([
      'coder',
      ELSE_CHILD,
      ELSE_CHILD,
      ELSE_CHILD,
      ELSE_CHILD,
    ]);
  });
});

describe('the law every reading of a judge obeys', () => {
  propertyTest.prop([labelsArb, fc.string({ minLength: 1 }), readingArb])(
    'every reading names a child the router holds and never anything else',
    (labels, elseChild, reading) => {
      const branches = branchesWearing(labels);
      const held = new Set([...branches.map((branch) => branch.child), elseChild]);

      expect(held.has(childOneReadingNames(branches, elseChild, reading))).toBe(true);
    },
  );

  propertyTest.prop([labelsArb])(
    'a label a branch wears always names the child behind that branch',
    (labels) => {
      const branches = branchesWearing(labels);

      for (const branch of branches) {
        const reading: JudgeReading = { heard: 'answer', label: branch.label };

        expect(childOneReadingNames(branches, ELSE_CHILD, reading)).toBe(branch.child);
      }
    },
  );

  propertyTest.prop([labelsArb, fc.string()])(
    'a label no branch wears always names the else child',
    (labels, answered) => {
      fc.pre(!labels.includes(answered));

      const reading: JudgeReading = { heard: 'answer', label: answered };

      expect(childOneReadingNames(branchesWearing(labels), ELSE_CHILD, reading)).toBe(ELSE_CHILD);
    },
  );
});
