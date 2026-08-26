import { providerMessageOf } from '@recompose/contracts';

import { failed } from '../answered-outcome';
import { parsedJson } from '../gateway-wire';
import { messageTheProviderSent } from './provider-error-message';

/**
 * What a row may quote from the answer one provider actually sent, or nothing at all.
 *
 * @summary The answer is read here rather than fetched again, because the observation span already
 * has every byte in hand and a second read would cost the caller its own stream. Only a failing
 * answer is read at all: a served answer is a completion, and a completion is the one thing no row
 * may ever carry. What survives is passed through the contract's own reading, so a provider that
 * answered with something shaped like a body leaves the row quoting nothing rather than costing the
 * row its place in the drawer.
 */
export function quoteTheAnswerAllows(status: number, answered: string): string | undefined {
  if (!failed(status)) return undefined;

  const spoken = messageTheProviderSent(parsedJson(answered));

  return spoken === undefined ? undefined : providerMessageOf(spoken);
}
