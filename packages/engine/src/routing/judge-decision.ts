import type { JudgeReading } from './outcome-classification';
import type { BranchRule } from './policies';

import { classifyJudge } from './outcome-classification';
import { branchWearingTheLabel, childTheLabelNames } from './policies';

export type BranchClassifier = (
  judge: string,
  branches: readonly BranchRule[],
) => Promise<JudgeReading>;

export type BranchQuestion = {
  judge: string;
  branches: readonly BranchRule[];
  elseChild: string;
  classify: BranchClassifier | undefined;
};

type Asking = { question: BranchQuestion; classify: BranchClassifier };

async function readingOneAskEarns(asking: Asking): Promise<JudgeReading> {
  return asking.classify(asking.question.judge, asking.question.branches);
}

async function childASecondAskEarns(asking: Asking): Promise<string> {
  const reading = await readingOneAskEarns(asking);

  return childOneReadingNames(asking.question.branches, asking.question.elseChild, reading);
}

async function childTheJudgeAnswers(asking: Asking): Promise<string> {
  const verdict = classifyJudge(await readingOneAskEarns(asking));

  if (verdict.verdict === 'to-else') return asking.question.elseChild;

  const named = branchWearingTheLabel(asking.question.branches, verdict.label);

  return named === undefined ? childASecondAskEarns(asking) : named.child;
}

/**
 * The child one conditional router hands this request to, judged at most twice.
 *
 * @summary Only an answer earns the second ask. A refusal and a silence past the budget are the
 * judge saying it cannot classify at all, so asking again spends a second call to learn the same
 * thing, while an answer no branch wears may well be the judge misreading a closed set it can read
 * on a second look. The second answer is final however it reads, which is what bounds a request at
 * two judge calls no matter how strangely the judge behaves.
 */
export async function childTheJudgeDecides(question: BranchQuestion): Promise<string> {
  const classify = question.classify;

  return classify === undefined ? question.elseChild : childTheJudgeAnswers({ question, classify });
}

/**
 * The one child a conditional router hands the request to for one reading of its judge.
 *
 * @summary Total by construction: the reading table sends every trouble to else and the label table
 * sends every unrecognised answer there too, so the two compose into a mapping no judge behaviour
 * can fall out of. That totality is what lets the walk ask once and act, rather than carrying a
 * "the judge said something strange" state the rest of the walk would have to understand.
 */
export function childOneReadingNames(
  branches: readonly BranchRule[],
  elseChild: string,
  reading: JudgeReading,
): string {
  const verdict = classifyJudge(reading);

  return verdict.verdict === 'answered'
    ? childTheLabelNames(branches, elseChild, verdict.label)
    : elseChild;
}
