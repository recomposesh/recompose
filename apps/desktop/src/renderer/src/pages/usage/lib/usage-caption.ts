export type BucketWidthWord = 'minute' | 'hour' | 'day';

type ScopeReading = {
  /** The gateway names the filter stands on, empty while it stands on everything. */
  gateways: readonly string[];
  /** The provider names the filter stands on, empty while it stands on everything. */
  providers: readonly string[];
  /** The window as the range control names it. */
  window: string;
};

/** The sentence under the chart title, naming the width and what a column height means. */
export function chartSubCaption(width: BucketWidthWord): string {
  return `${width} buckets · the column height is the window total`;
}

/** The sentence under the panels, naming the shared fold and where a day breaks. */
export function panelsCaption(width: BucketWidthWord): string {
  return `Every panel folds the same buckets · ${width} buckets · days break at your local midnight`;
}

function filterWording(members: readonly string[], everything: string, plural: string): string {
  if (members.length === 0) {
    return everything;
  }

  return members.length === 1 ? (members[0] ?? everything) : `${String(members.length)} ${plural}`;
}

/**
 * The sentence under the title, naming what the readings below it stand for.
 *
 * @summary A filter standing on everything says so, one member reads by name, and several read as
 * a count, so the sentence stays one line whatever the filter holds. Every figure on the screen is
 * printed in the reader's own zone, which the sentence ends by saying.
 */
export function scopeSentence(reading: ScopeReading): string {
  return [
    filterWording(reading.gateways, 'All gateways', 'gateways'),
    filterWording(reading.providers, 'All providers', 'providers'),
    reading.window,
    'local time',
  ].join(' · ');
}
