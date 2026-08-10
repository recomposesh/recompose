const WIDEST_PLAIN_COUNT = 999;

const A_THOUSAND = 1000;

const MS_IN_SECOND = 1000;

/**
 * A count as the strip prints it, compact once it outgrows three digits.
 *
 * @summary A cell that grew a digit under load would shove its neighbors along the strip, so past
 * a thousand the reading trades exactness for a fixed width and says so with the `k`.
 */
export function compactCount(count: number): string {
  if (count <= WIDEST_PLAIN_COUNT) {
    return String(count);
  }

  return `${(count / A_THOUSAND).toFixed(1)}k`;
}

/**
 * A latency as the strip prints it, in milliseconds until it reaches a second.
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
 * @summary The strip is read far more often than it is loaded, so a single request reads `1 client
 * app` rather than the plural a fixed label would leave standing.
 */
export function pluralized(count: number, thing: string): string {
  return count === 1 ? thing : `${thing}s`;
}
