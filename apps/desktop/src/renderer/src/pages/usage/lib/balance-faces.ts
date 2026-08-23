import type { AccountBalance } from '@recompose/contracts';

import { agedWording } from '../../../shared/lib';

const NOTHING_READ = '—';

const DOLLARS = 'USD';

/**
 * The money format one vendor's answer prints under.
 *
 * @summary A vendor that named no currency is counting dollars, which is what all but one of them
 * do. Printing a yuan balance under a dollar sign would misstate the figure by an order of
 * magnitude, so the sign follows the answer rather than the app.
 */
const inDollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: DOLLARS });

const inYuan = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'CNY' });

function moneyIn(currency: string | undefined): Intl.NumberFormat {
  return currency === 'CNY' ? inYuan : inDollars;
}

const CENTS_IN_A_DOLLAR = 100;

/**
 * What is left to spend, rounded to the cent the card prints before the sign is read.
 *
 * @summary A balance a vendor derived from two floats can land a hair either side of zero, and a
 * hair below it prints as a debt on a wallet that owes nothing. Rounding to the cent first is what
 * stops a card from reading a rounding error as money owed.
 */
function remainingWording(remaining: number, money: Intl.NumberFormat): string {
  const cents = Math.round(remaining * CENTS_IN_A_DOLLAR);

  return money.format(cents === 0 ? 0 : cents / CENTS_IN_A_DOLLAR);
}

/**
 * What was bought and what went, or nothing where the vendor reported only a balance.
 *
 * @summary A vendor that names one side alone leaves the other unknowable, and printing a zero
 * there would say a wallet was never topped up rather than that nobody said.
 */
function detailWording(
  added: number | undefined,
  spent: number | undefined,
  money: Intl.NumberFormat,
): string | undefined {
  if (added === undefined || spent === undefined) {
    return undefined;
  }

  return `${money.format(added)} added · ${money.format(spent)} spent`;
}

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
    remaining: remainingWording(reading.remaining, moneyIn(reading.currency)),
    detail: detailWording(reading.added, reading.spent, moneyIn(reading.currency)),
    stamp: `Read ${agedWording(reading.readAt, now)}`,
    failure: balance.failure,
  };
}
