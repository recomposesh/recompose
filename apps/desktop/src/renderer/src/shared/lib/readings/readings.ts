const MAGNITUDE_LADDER = [
  { floor: 1_000_000_000, mark: 'B' },
  { floor: 1_000_000, mark: 'M' },
  { floor: 1_000, mark: 'k' },
] as const;

const MS_IN_SECOND = 1000;

const MS_IN_MINUTE = 60_000;

const MS_IN_HOUR = 3_600_000;

const GROUPED = new Intl.NumberFormat('en-US');

/**
 * A count as a dense cell prints it, compact once it outgrows three digits.
 *
 * @summary A cell that grew a digit under load would shove its neighbors along the strip, so past
 * a thousand the reading trades exactness for a fixed width and climbs the magnitude ladder
 * through `k`, `M`, and `B` as the count outgrows each rung.
 */
export function compactCount(count: number): string {
  const rung = MAGNITUDE_LADDER.find(({ floor }) => count >= floor);

  if (rung === undefined) {
    return String(count);
  }

  return `${(count / rung.floor).toFixed(1)}${rung.mark}`;
}

/**
 * A count as a headline prints it, exact and grouped.
 *
 * @summary A tile headline is the one number on the screen a person came to read, so it never
 * trades exactness for width the way a dense cell does.
 */
export function exactCount(count: number): string {
  return GROUPED.format(count);
}

/**
 * A latency as a reading prints it, in milliseconds until it reaches a second.
 *
 * @summary A quiet window reads `0ms` rather than an empty cell, because the reading a person
 * watches has to stand in place whether or not anything flowed through it.
 */
export function readDuration(milliseconds: number): string {
  if (milliseconds < MS_IN_SECOND) {
    return `${String(Math.round(milliseconds))}ms`;
  }

  return `${(milliseconds / MS_IN_SECOND).toFixed(1)}s`;
}

/**
 * A cell's noun agreeing with the number in front of it.
 *
 * @summary A reading is read far more often than it is loaded, so a single request reads `1 client
 * app` rather than the plural a fixed label would leave standing.
 */
export function pluralized(count: number, thing: string): string {
  return count === 1 ? thing : `${thing}s`;
}

/**
 * How long ago a stamped reading was taken, one unit coarse.
 *
 * @summary Every surface printing a reading's own age reads it through this, so a stamp says the
 * same thing wherever it stands. A stamp ahead of the reader's clock reads as just taken, because
 * main and the renderer keep their own clocks and a negative age would read as broken.
 */
export function agedWording(at: number, now: number): string {
  const passed = Math.max(0, now - at);

  if (passed < MS_IN_MINUTE) {
    return `${String(Math.floor(passed / MS_IN_SECOND))}s ago`;
  }

  if (passed < MS_IN_HOUR) {
    return `${String(Math.floor(passed / MS_IN_MINUTE))}m ago`;
  }

  return `${String(Math.floor(passed / MS_IN_HOUR))}h ago`;
}
