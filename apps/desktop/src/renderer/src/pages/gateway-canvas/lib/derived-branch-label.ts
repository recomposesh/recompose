/**
 * How much of a rule a label may spend, past which the cable pill has nowhere to print it.
 *
 * @summary The label is the judge's own vocabulary as well as the word on the cable, so a budget
 * measured in characters serves both: the pill truncates past roughly this width, and a long
 * classification token buys the judge nothing it could not read from the rule itself.
 */
const LABEL_BUDGET = 24;

function openingOf(rule: string): string {
  const said = rule.trim().replaceAll(/\s+/gu, ' ');

  if (said.length <= LABEL_BUDGET) {
    return said;
  }

  const reach = said.slice(0, LABEL_BUDGET + 1);
  const lastSpace = reach.lastIndexOf(' ');

  return lastSpace === -1 ? said.slice(0, LABEL_BUDGET) : reach.slice(0, lastSpace);
}

function clearOf(opening: string, standing: ReadonlySet<string>): string {
  let rank = 2;

  while (standing.has(`${opening} ${String(rank)}`)) {
    rank += 1;
  }

  return `${opening} ${String(rank)}`;
}

/**
 * The label a rule draws for itself, standing clear of every label its siblings already wear.
 *
 * @summary A person who wrote the rule and left the label blank still owes the judge a word, and
 * the stored shape refuses a blank one, so the word is cut from the rule at the edit rather than
 * invented somewhere a person cannot see it. It is cut at a word so the pill never prints half a
 * word, and the whole rule stands when it is short enough to read as a label on its own. A number
 * settles a collision rather than a longer cut, because the stored shape demands the labels of one
 * router differ and two rules opening the same way would otherwise refuse the second save with a
 * message written for a developer.
 */
export function derivedBranchLabel(rule: string, taken: Iterable<string>): string {
  const opening = openingOf(rule);
  const standing = new Set([...taken].map((label) => label.trim()));

  return standing.has(opening) ? clearOf(opening, standing) : opening;
}
