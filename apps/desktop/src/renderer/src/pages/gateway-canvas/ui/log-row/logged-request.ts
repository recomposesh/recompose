import type { Account, LogRow as LoggedRequest } from '@recompose/contracts';

import { accountName } from '../../../../entities/account';

const TWO_DIGITS = 2;
const MS_PER_SECOND = 1000;
const ONE_DECIMAL = 1;

/** How tall one row stands, which the virtualized list measures its whole run against. */
export const LOG_ROW_HEIGHT = 30;

function padded(part: number): string {
  return String(part).padStart(TWO_DIGITS, '0');
}

/** The time of day a request was answered, which is the one stamp that crossed both boundaries. */
export function servedAt(at: number): string {
  const stamp = new Date(at);

  return [stamp.getHours(), stamp.getMinutes(), stamp.getSeconds()].map(padded).join(':');
}

/** How long a request took, or nothing at all where it never finished. */
export function tookFor(durationMs: number | undefined): string {
  return durationMs === undefined ? '' : `${(durationMs / MS_PER_SECOND).toFixed(ONE_DECIMAL)}s`;
}

/** Everything that carries a reading, run together and separated once. */
function reading(parts: readonly string[], between: string): string {
  return parts.filter((part) => part !== '').join(between);
}

function named(logged: LoggedRequest, account: Account | undefined): string {
  if (account !== undefined) {
    return accountName(account);
  }

  return logged.accountId ?? '';
}

/**
 * Who answered a request: the provider and the account it was served through.
 *
 * @summary An account that has left the registry leaves its raw id standing rather than a blank,
 * because the request did reach something and a person repairing the composition needs to know what.
 */
export function servedBy(logged: LoggedRequest, account: Account | undefined): string {
  return logged.provider === undefined
    ? ''
    : reading([logged.provider, named(logged, account)], ' · ');
}

/**
 * One request as a line of text, which is what a copy of the row hands over.
 *
 * @summary The line is the row read out in reading order, so what lands in a paste is what stood on
 * screen rather than a second rendering of the same facts. A cell that never filled leaves no gap
 * behind, because a gateway-raised row that never reached a provider has nothing to say there.
 */
export function copiedRow(logged: LoggedRequest, account: Account | undefined): string {
  return reading(
    [
      servedAt(logged.at),
      logged.method,
      reading([logged.virtualModel ?? '', logged.providerModel ?? ''], ' → '),
      servedBy(logged, account),
      String(logged.status),
      tookFor(logged.durationMs),
    ],
    ' ',
  );
}
