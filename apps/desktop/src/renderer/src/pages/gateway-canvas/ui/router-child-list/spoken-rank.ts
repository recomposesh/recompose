const ORDINALS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
];

const TALLIES = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/**
 * The rank a moved row landed on, in the words a live region says it out loud in.
 *
 * @summary A person moving a row hears where it landed rather than that something moved, which is
 * the same fact the printed rank gives everyone reading the ladder. A ladder longer than the words
 * carry falls back to digits, because a number said plainly beats a word nobody has for it.
 */
export function spokenRank(rank: number, total: number): string {
  return `${ORDINALS[rank - 1] ?? String(rank)} of ${TALLIES[total - 1] ?? String(total)}`;
}
