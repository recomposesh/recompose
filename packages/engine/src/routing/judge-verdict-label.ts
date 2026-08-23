import { declineWordFor } from '@recompose/contracts';

import type { JudgeReading } from './outcome-classification';
import type { BranchRule } from './policies';

import { classifyJudge } from './outcome-classification';
import { branchWearingTheLabel, childTheLabelNames } from './policies';

/**
 * The word a judge answered with, or nothing where the reading carried no answer at all.
 *
 * @summary The one place a reading is narrowed to its word, so the label table, the decline and the
 * pin question are each answered from a single reading of the verdict rather than from classifying
 * the same answer once per question asked of it.
 */
export function labelOneReadingCarries(reading: JudgeReading): string | undefined {
  const verdict = classifyJudge(reading);

  return verdict.verdict === 'answered' ? verdict.label : undefined;
}

export function labelABranchWears(branches: readonly BranchRule[], reading: JudgeReading): boolean {
  return branchWearingTheLabel(branches, labelOneReadingCarries(reading)) !== undefined;
}

/**
 * Whether the judge used the one word that means the request resembles no branch at all.
 *
 * @summary A decline is a classification rather than a failure to make one, so it settles on the
 * first ask. Spending a second would only ask a judge to think again about an answer it was handed a
 * word for, and the else child is where that answer already belongs.
 */
export function judgeDeclined(branches: readonly BranchRule[], reading: JudgeReading): boolean {
  return labelOneReadingCarries(reading) === declineWordFor(branches);
}

/**
 * The one child a conditional router hands the request to for one reading of its judge.
 *
 * @summary Total by construction: the reading table sends every trouble to else and the label table
 * sends every unrecognized answer there too, so the two compose into a mapping no judge behavior can
 * fall out of. That totality is what lets the walk ask once and act, rather than carrying a "the
 * judge said something strange" state the rest of the walk would have to understand.
 */
export function childOneReadingNames(
  branches: readonly BranchRule[],
  elseChild: string,
  reading: JudgeReading,
): string {
  return childTheLabelNames(branches, elseChild, labelOneReadingCarries(reading));
}
