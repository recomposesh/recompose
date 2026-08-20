/**
 * How many children the mono line says a router holds.
 *
 * @summary A router holding none says so in words rather than counting to zero, because a zero on
 * a card reads as a measurement where a person needs to see that the work is unfinished. The count
 * says children rather than targets, since a child of a router may be another router.
 */
export function childTally(count: number): string {
  if (count === 0) {
    return 'no child';
  }

  return count === 1 ? '1 child' : `${String(count)} children`;
}

function branchCount(count: number): string {
  if (count === 0) {
    return 'no branch';
  }

  return count === 1 ? '1 branch' : `${String(count)} branches`;
}

type JudgedReading = { branches: number; judge: string | undefined; judgeAnswers: boolean };

/** How the judge half of the line reads: absent, unable to answer, or standing. */
function judgeStanding(reading: Omit<JudgedReading, 'branches'>): string {
  if (reading.judge === undefined) {
    return 'no judge';
  }

  return reading.judgeAnswers ? 'one judge' : 'judge cannot answer';
}

/**
 * What a router the judge decides says on its mono line, in the words the child count already uses.
 *
 * @summary The count says branches rather than children, because a person reading "3 children"
 * under a judge would go looking for a third rule and find the else child instead. The judge rides
 * the same line: until one stands in the table every request the router takes lands on else, which
 * is the fact a person needs before they read a single rule. A judge that cannot answer is counted
 * as none of one, because the card is already dashed for it and a caption saying one judge beside a
 * dashed frame would leave a person hunting for the trouble the frame is about.
 */
export function branchTally(count: number, reading: Omit<JudgedReading, 'branches'>): string {
  return `${branchCount(count)}, ${judgeStanding(reading)}`;
}

/**
 * Whether a router's card says the composition around it is unfinished.
 *
 * @summary A router with nowhere to send a request is the plain case. A conditional router adds
 * one: its judge decides every request it takes, so a judge that cannot answer leaves the router
 * sending everything to else however many children stand under it. The canvas says so at compose
 * time rather than waiting for a request to prove it.
 */
export function standsIncomplete(childCount: number, judged: JudgedReading | undefined): boolean {
  return childCount === 0 || (judged !== undefined && !judged.judgeAnswers);
}
