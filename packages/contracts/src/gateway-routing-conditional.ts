import { z } from 'zod';

import { nonBlankString } from './non-blank';

const branchSchema = z.strictObject({
  label: nonBlankString,
  rule: nonBlankString,
  child: nonBlankString,
});

export const conditionalPolicySchema = z.strictObject({
  mode: z.literal('conditional'),
  judge: nonBlankString,
  branches: z.array(branchSchema),
  elseChild: nonBlankString,
  judgeBoundMs: z.number().int().positive(),
  rejudgeEveryRequest: z.boolean(),
});

export type ConditionalPolicy = z.infer<typeof conditionalPolicySchema>;

type PolicyRefusal = { at: 'branches' | 'elseChild' | 'judge'; message: string };

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
): readonly PolicyRefusal[] {
  const held = new Set(children);

  return [...elseRefusals(policy, held), ...branchRefusals(policy, held)];
}
