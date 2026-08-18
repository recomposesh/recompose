import type { AccountBalance } from '@recompose/contracts';

import { agedWording } from '../../../shared/lib';

const NOTHING_READ = '—';

const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export type BalanceFace = {
  /** The account the card stands for. */
  accountId: string;
  /** What is left to spend, already printed. */
  remaining: string;
  /** What was added and what was spent, absent until a reading lands. */
  detail: string | undefined;
  /** When the reading was taken, absent until one lands. */
  stamp: string | undefined;
  /** Why the last read failed, absent while reads are landing. */
  failure: string | undefined;
};

/**
 * One aggregator account's credits as a card prints them.
 *
 * @summary The headline is what is left rather than what was bought, and the two figures behind it
 * print so the subtraction can be checked. A failed read keeps the last reading beside its own
 * stamp instead of blanking, because a card that empties over a blip reads as a spent account, and
 * a read that never landed prints no figure at all rather than a zero it cannot vouch for.
 */
export function balanceFaceOf(balance: AccountBalance, now: number): BalanceFace {
  const { reading } = balance;

  if (reading === undefined) {
    return {
      accountId: balance.accountId,
      remaining: NOTHING_READ,
      detail: undefined,
      stamp: undefined,
      failure: balance.failure,
    };
  }

  return {
    accountId: balance.accountId,
    remaining: dollars.format(reading.totalCredits - reading.totalUsage),
    detail: `${dollars.format(reading.totalCredits)} added · ${dollars.format(reading.totalUsage)} spent`,
    stamp: `Read ${agedWording(reading.readAt, now)}`,
    failure: balance.failure,
  };
}
