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

/** What a row is called out loud, which is enough of it to tell one row from its siblings. */
type SpokenRow = { name: string; label?: string | undefined };

/**
 * What a moved row is called out loud, which is its branch label wherever one names it.
 *
 * @summary A branch answers to the word the judge answers with, and that word is what a person
 * moved rather than the account behind it: two branches can sit on one account, so announcing the
 * account would tell someone that something moved without telling them which. A child holding no
 * label yet has only its account to be called by, which is also what the row prints.
 */
export function spokenSubject({ name, label }: SpokenRow): string {
  const named = label?.trim() ?? '';

  return named === '' ? name : `the ${named} branch`;
}
