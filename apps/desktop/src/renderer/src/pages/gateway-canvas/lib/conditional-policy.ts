import type { RouteNode, RouterPolicy } from '@recompose/contracts';

import { derivedBranchLabel } from './derived-branch-label';

/** What a conditional router decides by, which is the judge, the branches, and the else child. */
export type ConditionalPolicy = Extract<RouterPolicy, { mode: 'conditional' }>;

/** One branch of a conditional router, pairing the judge's word for it with the rule behind it. */
export type Branch = ConditionalPolicy['branches'][number];

/** What a person writes on one branch, which together are the judge's whole vocabulary for it. */
export type BranchWording = { label: string; rule: string };

/**
 * How long a fresh conditional router waits on its judge before the request goes to else.
 *
 * @summary Three seconds is long enough for a fast model to answer and short enough that a person
 * waiting on the request never reads the wait as a hang. It is stored rather than fixed, because a
 * judge behind a slower channel is a per-router fact rather than a rule about the mode.
 */
const BORN_JUDGE_BOUND_MS = 3000;

/**
 * The policy a conditional router is born under, which is a judge and somewhere to catch the rest.
 *
 * @summary It is born with no branch at all, because a branch arrives with the cable that binds its
 * child and cannot be written before there is a child to write it about. Re-judging stays off, so a
 * conversation keeps the branch it first earned and its prompt cache survives.
 */
export function bornConditionalPolicy(judge: string, elseChild: string): ConditionalPolicy {
  return {
    mode: 'conditional',
    judge,
    branches: [],
    elseChild,
    judgeBoundMs: BORN_JUDGE_BOUND_MS,
    rejudgeEveryRequest: false,
  };
}

/** How a node spreads conditionally, or nothing where it is no conditional router. */
export function conditionalIn(node: RouteNode | undefined): ConditionalPolicy | undefined {
  if (node?.kind !== 'router' || node.policy.mode !== 'conditional') {
    return undefined;
  }

  return node.policy;
}

/**
 * Whether one node is a fixture of the router above it rather than a child it merely holds.
 *
 * @summary The else child and the judge are both named by the policy itself, so a table missing
 * either is a table the stored shape refuses. Reach for it wherever an edit would take a node away,
 * so the refusal lands before the write rather than at parse.
 */
function standsPermanently(policy: ConditionalPolicy, nodeId: string): boolean {
  return policy.elseChild === nodeId || policy.judge === nodeId;
}

function labelsBeside(policy: ConditionalPolicy, child: string): string[] {
  return policy.branches.flatMap((branch) => (branch.child === child ? [] : [branch.label]));
}

function clashesWithASibling(policy: ConditionalPolicy, written: Branch): boolean {
  return policy.branches.some(
    (branch) => branch.child !== written.child && branch.label.trim() === written.label,
  );
}

/**
 * The word this branch will answer to, which is the one a person typed or the one its rule draws.
 *
 * @summary A person who wrote the rule and left the label blank meant the rule, so the write fills
 * the word rather than refusing a save they would not know how to satisfy. A word they typed is
 * never drawn over, however well the rule would have read.
 */
function labelWritten(policy: ConditionalPolicy, child: string, wording: BranchWording): string {
  const typed = wording.label.trim();

  return typed === '' ? derivedBranchLabel(wording.rule, labelsBeside(policy, child)) : typed;
}

function outsideTheBranches(
  policy: ConditionalPolicy,
  children: readonly string[],
  child: string,
): boolean {
  return child === policy.elseChild || !children.includes(child);
}

function branchesCarrying(policy: ConditionalPolicy, written: Branch): Branch[] {
  return policy.branches.some((branch) => branch.child === written.child)
    ? policy.branches.map((branch) => (branch.child === written.child ? written : branch))
    : [...policy.branches, written];
}

/**
 * The branches a router holds once one child answers to a label and a rule, or nothing if it can't.
 *
 * @summary Nothing means the write is refused, and every refusal here is one the stored shape would
 * refuse anyway: a blank rule, a label a sibling branch already wears once both are trimmed, the
 * else child, and a child this router does not hold. Refusing at the edit keeps a save from
 * bouncing off the schema with a message written for a developer. A blank label is filled from the
 * rule instead of refused, because the rule is the whole of what a person meant and the stored
 * shape only demands that some word stand there. The label reaches storage trimmed, because the
 * judge answers with the very word a person reads on the cable.
 */
export function branchesWriting(
  policy: ConditionalPolicy,
  children: readonly string[],
  child: string,
  wording: BranchWording,
): Branch[] | undefined {
  const rule = wording.rule.trim();

  if (rule === '' || outsideTheBranches(policy, children, child)) {
    return undefined;
  }

  const written = { label: labelWritten(policy, child, wording), rule, child };

  return clashesWithASibling(policy, written) ? undefined : branchesCarrying(policy, written);
}

/** The node once the ids named here have left the table, so no branch names a gone child. */
export function nodeWithout(node: RouteNode, gone: ReadonlySet<string>): RouteNode {
  if (node.kind !== 'router') {
    return node;
  }

  const policy = conditionalIn(node);
  const children = node.children.filter((child) => !gone.has(child));

  return policy === undefined
    ? { ...node, children }
    : {
        ...node,
        children,
        policy: { ...policy, branches: policy.branches.filter((held) => !gone.has(held.child)) },
      };
}

/** Whether any conditional router in this table names the node as its else child or its judge. */
export function namedByAPolicyAbove(nodes: Iterable<RouteNode>, nodeId: string): boolean {
  for (const node of nodes) {
    const policy = conditionalIn(node);

    if (policy !== undefined && standsPermanently(policy, nodeId)) {
      return true;
    }
  }

  return false;
}
