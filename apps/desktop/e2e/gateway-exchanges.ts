import type { Page } from '@playwright/test';

import type { GatewayAnswer } from './gateway-client';

/** One question a scenario put to a gateway, beside the answer that came back. */
export type Exchange = { gateway: string; answer: GatewayAnswer };

const exchanges = new WeakMap<Page, Exchange[]>();

/**
 * Keeps what a gateway answered, so a Then can read it without sending a second request.
 *
 * @summary One record per page rather than one per step file, because a scenario reads its own
 * answers whichever file wrote the step that sent them.
 */
export function recordExchange(page: Page, gateway: string, answer: GatewayAnswer): void {
  exchanges.set(page, [...(exchanges.get(page) ?? []), { gateway, answer }]);
}

export function heldExchanges(page: Page): Exchange[] {
  const held = exchanges.get(page) ?? [];

  if (held.length === 0) {
    throw new Error('no step sent a request the scenario could read an answer from');
  }

  return held;
}

/** The answer the last request drew, refused when it came from a gateway the step never named. */
export function lastAnswerFrom(page: Page, gateway: string): GatewayAnswer {
  const last = heldExchanges(page).at(-1);

  if (last === undefined || last.gateway !== gateway) {
    throw new Error(`the last request went to "${last?.gateway ?? 'nothing'}", not "${gateway}"`);
  }

  return last.answer;
}

/** The last two answers, which is what a scenario comparing one refusal against another reads. */
export function lastTwoAnswers(page: Page): [GatewayAnswer | undefined, GatewayAnswer | undefined] {
  const held = heldExchanges(page);

  return [held.at(-2)?.answer, held.at(-1)?.answer];
}
