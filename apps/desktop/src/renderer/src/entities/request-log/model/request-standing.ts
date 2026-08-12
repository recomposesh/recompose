import type { LogRow } from '@recompose/contracts';

const FIRST_FAILING_STATUS = 400;

/** Whether a provider response has started but its body has not finished or failed yet. */
export function requestInFlight(row: LogRow): boolean {
  return row.origin === 'provider' && row.durationMs === undefined;
}

/**
 * Whether a request failed, which is where the app decides what counts as an error.
 *
 * @summary The footer's error count, the drawer's errors toggle, and the usage screen's error
 * readings all take the answer from here, so a tally and a filtered list can never disagree about
 * the same request.
 */
export function requestFailed(row: LogRow): boolean {
  return !requestInFlight(row) && row.status >= FIRST_FAILING_STATUS;
}
