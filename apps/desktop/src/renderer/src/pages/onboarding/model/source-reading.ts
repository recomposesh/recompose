/** How far one marked source has got at saying what it serves. */
export type ListingStanding = 'looking' | 'listed' | 'unlisted';

/** One marked source, as the reading that stands over all of them sees it. */
export type SourceListing = {
  /** What the source reads as, which is how a refusal names it. */
  title: string;
  /** How far its own listing has got. */
  standing: ListingStanding;
};

/** Whether the run can open on the marked sources, and what stops it where it cannot. */
export type SourceReading =
  | { standing: 'listed'; refusal?: undefined }
  | { standing: 'looking'; refusal?: undefined }
  | { standing: 'refused'; refusal: string };

const NOTHING_CONNECTED = 'No source is connected yet. Go back and connect one.';

const NAMED = new Intl.ListFormat('en', { type: 'conjunction' });

function silenceReads(titles: readonly string[]): string {
  return `recompose couldn't read the model list for ${NAMED.format(titles)}. Check the connection and try again.`;
}

/**
 * Whether the run can open on what the marked sources answered.
 *
 * @summary A source that answered nothing and a source still answering are two different states,
 * and a run that folded them together would sit on a turning ring for as long as the window stayed
 * open. So a silence is reported as a refusal rather than waited on, and it outranks a source still
 * answering, because an answer that has arrived settles the run sooner than one that may never.
 *
 * The silent sources are named because a person holding three accounts has to know which one to go
 * and look at, and the lane behind the listing folds an unreachable provider, a credential a vendor
 * turned away, and a body that was not a catalog into one silence, so which account it was is the
 * only thing left worth saying.
 */
export function sourceReadingOf(listings: readonly SourceListing[]): SourceReading {
  if (listings.length === 0) {
    return { standing: 'refused', refusal: NOTHING_CONNECTED };
  }

  const silent = listings.filter((listing) => listing.standing === 'unlisted');

  if (silent.length > 0) {
    return { standing: 'refused', refusal: silenceReads(silent.map((listing) => listing.title)) };
  }

  return listings.some((listing) => listing.standing === 'looking')
    ? { standing: 'looking' }
    : { standing: 'listed' };
}
