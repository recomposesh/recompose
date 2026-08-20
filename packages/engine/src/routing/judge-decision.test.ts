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

/**
 * Branch labels drawn the way a stored router may hold them, padding and all.
 *
 * @summary Two branches are told apart by the word they are sent under rather than by the raw
 * string, because the stored shape refuses a label a sibling already wears once both are trimmed
 * and a judge handed one word twice could not name either branch apart.
 */
const labelsArb = fc.uniqueArray(fc.string({ minLength: 1, maxLength: 5 }), {
  maxLength: 4,
  selector: (label) => label.trim(),
});

function wordItIsSentUnder(label: string): string {
  return label.trim();
}

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

  test('a padded branch answers to the word it was sent under and to nothing else', () => {
    const padded = branchesWearing(['  code  ', 'chat']);

    expect(childOneReadingNames(padded, ELSE_CHILD, { heard: 'answer', label: 'code' })).toBe(
      'behind-  code  ',
    );
    expect(childOneReadingNames(padded, ELSE_CHILD, { heard: 'answer', label: '  code  ' })).toBe(
      ELSE_CHILD,
    );
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
    'the word a branch is sent under always names the child behind that branch',
    (labels) => {
      const branches = branchesWearing(labels);

      for (const branch of branches) {
        const reading: JudgeReading = {
          heard: 'answer',
          label: wordItIsSentUnder(branch.label),
        };

        expect(childOneReadingNames(branches, ELSE_CHILD, reading)).toBe(branch.child);
      }
    },
  );

  propertyTest.prop([labelsArb, fc.string()])(
    'a word no branch is sent under always names the else child',
    (labels, answered) => {
      fc.pre(!labels.map(wordItIsSentUnder).includes(answered));

      const reading: JudgeReading = { heard: 'answer', label: answered };

      expect(childOneReadingNames(branchesWearing(labels), ELSE_CHILD, reading)).toBe(ELSE_CHILD);
    },
  );
});
