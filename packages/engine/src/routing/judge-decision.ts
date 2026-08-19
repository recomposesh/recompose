import type { JudgeReading } from './outcome-classification';
import type { BranchRule } from './policies';

import { classifyJudge } from './outcome-classification';
import { childTheLabelNames } from './policies';

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
