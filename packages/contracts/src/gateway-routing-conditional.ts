import { z } from 'zod';

import { nonBlankString } from './non-blank';

const branchSchema = z.strictObject({
  label: nonBlankString,
  rule: nonBlankString,
  child: nonBlankString,
});

/**
 * How long a conditional router waits on its judge when nobody has said otherwise.
 *
 * @summary Half a minute is long enough that a judge behind a slow channel, a cold model, or a
 * queue still answers inside it, and short enough that a request nothing will ever come back for
 * refuses rather than hanging. It is the born value and the one a stored router that never chose is
 * lifted to, so both read it here rather than each carrying its own copy of the same number.
 */
export const BORN_JUDGE_BOUND_MS = 30_000;

/**
 * The standing instruction one router hands its judge, read ahead of the labels and the rules.
 *
 * @summary It is optional because a router whose labels already read plainly needs no preamble, and
 * every table stored before this field existed is one of those. It carries a person's own words and
 * nothing structural: the label set, the ordering, and the marking of the request stay machine-owned,
 * so a directive can steer a reading without ever widening what the judge is allowed to answer.
 */
export const conditionalPolicySchema = z.strictObject({
  mode: z.literal('conditional'),
  judge: nonBlankString,
  branches: z.array(branchSchema),
  elseChild: nonBlankString,
  judgeBoundMs: z.number().int().positive(),
  rejudgeEveryRequest: z.boolean(),
  directive: nonBlankString.optional(),
});

export type ConditionalPolicy = z.infer<typeof conditionalPolicySchema>;

type PolicyRefusal = { at: 'branches' | 'elseChild' | 'judge'; message: string };

export type JudgeSeat = { kind: 'router' | 'target' | undefined; standsAsChild: boolean };

function judgeRefusals(policy: ConditionalPolicy, seat: JudgeSeat): PolicyRefusal[] {
  const judge = policy.judge;
  const refusals: PolicyRefusal[] = [];

  if (seat.kind === undefined) {
    refusals.push({ at: 'judge', message: `the judge ${judge} names no node in the table` });
  } else if (seat.kind === 'router') {
    refusals.push({
      at: 'judge',
      message: `the judge ${judge} names a router rather than a target`,
    });
  }

  if (seat.standsAsChild) {
    refusals.push({ at: 'judge', message: `the judge ${judge} also stands as a child` });
  }

  return refusals;
}

function elseRefusals(policy: ConditionalPolicy, children: ReadonlySet<string>): PolicyRefusal[] {
  if (children.has(policy.elseChild)) {
    return [];
  }

  const stray = policy.elseChild;

  return [
    { at: 'elseChild', message: `the else child ${stray} stands outside this router's children` },
  ];
}

function branchRefusals(policy: ConditionalPolicy, children: ReadonlySet<string>): PolicyRefusal[] {
  const refusals: PolicyRefusal[] = [];
  const labels = new Set<string>();

  for (const branch of policy.branches) {
    const label = branch.label.trim();

    if (labels.has(label)) {
      refusals.push({
        at: 'branches',
        message: `the label ${label} stands on more than one branch`,
      });
    }

    labels.add(label);

    if (!children.has(branch.child)) {
      refusals.push({
        at: 'branches',
        message: `the ${branch.label} branch names ${branch.child}, standing outside this router's children`,
      });
    }
  }

  return refusals;
}

export function refusalsOfAConditionalPolicy(
  policy: ConditionalPolicy,
  children: readonly string[],
  judge: JudgeSeat,
): readonly PolicyRefusal[] {
  const held = new Set(children);

  return [
    ...elseRefusals(policy, held),
    ...branchRefusals(policy, held),
    ...judgeRefusals(policy, judge),
  ];
}
