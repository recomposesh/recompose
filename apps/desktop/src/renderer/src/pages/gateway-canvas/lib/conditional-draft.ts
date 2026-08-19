import type { BranchWording } from './conditional-policy';

/** The account and the real model a judge reads requests with, which is a binding like any other. */
export type JudgeBinding = { accountId: string; providerModel: string };

/** One child of a router being switched, holding whatever a person has written about it so far. */
type DraftBranch = {
  /** The id the stored table already holds this child under, which the write names it by. */
  routeNodeId: string;
  /** The word the judge will answer with for this child, blank until a person writes one. */
  label: string;
  /** What that word means, blank until a person writes it. */
  rule: string;
};

/** What a person is filling in while a stored router is being switched to conditional. */
export type ConditionalSwitch = {
  /** Every child in declared order, the last of which stands as the else branch. */
  branches: readonly DraftBranch[];
  /** What will read the requests, or nothing while nobody has bound one. */
  judge: JudgeBinding | undefined;
};

/**
 * The definition a person walks into when a stored router is switched to conditional.
 *
 * @summary Every child arrives blank rather than carrying a label guessed from the account behind
 * it, because a label is the judge's vocabulary: a word nobody wrote would route real requests by
 * a rule nobody agreed to. The blankness is the amber state the rows paint until each is answered.
 */
export function switchOpenedOn(children: readonly string[]): ConditionalSwitch {
  return {
    branches: children.map((routeNodeId) => ({ routeNodeId, label: '', rule: '' })),
    judge: undefined,
  };
}

/**
 * Which children still owe a label and a rule, which is every one the else child is not.
 *
 * @summary The last declared child stands as else, so it owes nothing: it catches exactly what no
 * rule placed. Reading it off declared order rather than off a flag keeps the definition holding
 * one fact per child.
 */
function branchesOwing(held: ConditionalSwitch): readonly DraftBranch[] {
  return held.branches.slice(0, -1);
}

function labelsCollide(owing: readonly DraftBranch[]): boolean {
  const spoken = owing.map((branch) => branch.label.trim());

  return new Set(spoken).size !== spoken.length;
}

/**
 * Whether this switch can be stored, which is whether the stored shape would take it whole.
 *
 * @summary The schema refuses a partial policy by design, so the definition answers the same
 * question first and the save is never offered a press that would bounce off a message written for
 * a developer. Whole means three things: a judge binds, every child but the last holds a label and
 * a rule once trimmed, and no two of those labels are the same word, because one word reaching two
 * children would leave the judge a vocabulary no cable explains. A router holding one child is
 * whole the moment a judge binds, since that child is the else.
 */
export function switchWhole(held: ConditionalSwitch): boolean {
  const owing = branchesOwing(held);

  return (
    judgeAnswered(held.judge) &&
    owing.every((branch) => branch.label.trim() !== '' && branch.rule.trim() !== '') &&
    !labelsCollide(owing)
  );
}

/** The switch once one of its children answers to a label and a rule, leaving its siblings alone. */
export function switchRuling(
  held: ConditionalSwitch,
  child: string,
  wording: BranchWording,
): ConditionalSwitch {
  return {
    ...held,
    branches: held.branches.map((branch) =>
      branch.routeNodeId === child ? { ...branch, ...wording } : branch,
    ),
  };
}

/**
 * The switch once a different model reads its requests, with every branch left exactly as it stood.
 *
 * @summary Binding the judge is not rewriting the vocabulary: a person trying a cheaper reader
 * keeps the words they already wrote.
 */
export function switchBindingJudge(
  held: ConditionalSwitch,
  judge: JudgeBinding,
): ConditionalSwitch {
  return { ...held, judge };
}

/**
 * Whether the judge has been named whole, which is the last answer a conditional draft waits on.
 *
 * @summary Half a judge is worse than none: a router stored against an account with no model would
 * parse and then refuse every request it read, so the save stays shut until both halves stand.
 */
export function judgeAnswered(judge: JudgeBinding | undefined): boolean {
  return judge !== undefined && judge.accountId !== '' && judge.providerModel !== '';
}
