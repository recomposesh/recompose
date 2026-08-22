import type { SubscriptionProviderId } from '@recompose/contracts';

import type { ProviderDialect } from '../gateway-wire';
import type { JsonObject } from '../gateway-wire';
import type { ProviderRequest } from './claude-request';

import { providerObservability, providerRequestId } from '../provider/provider-observability';

type SubscriptionSend = (
  provider: SubscriptionProviderId,
  request: ProviderRequest,
) => Promise<Response>;

function providerDialect(provider: SubscriptionProviderId): ProviderDialect {
  if (provider === 'anthropic') return 'anthropic';
  if (provider === 'antigravity') return 'gemini';

  return 'responses';
}

const UNREACHED_STATUS = 502;

/**
 * One subscription send, watched from the moment it leaves to the moment something settles it.
 *
 * @summary A send that throws settles the span before the failure travels on, because a span left
 * open shows a person a request still in flight for as long as the process lives. A cut-off call
 * takes exactly that path: the signal ends the request rather than answering it, so nothing here
 * ever reads a status off a response.
 */
export async function sendObservedSubscription(
  provider: SubscriptionProviderId,
  accountId: string,
  body: JsonObject,
  request: ProviderRequest,
  send: SubscriptionSend,
): Promise<Response> {
  const span = providerObservability().start({
    provider,
    model: typeof body['model'] === 'string' ? body['model'] : '',
    accountId,
    dialect: providerDialect(provider),
    method: 'POST',
    requestId: providerRequestId(new Headers(request.headers)),
  });

  try {
    return span.observe(await send(provider, request));
  } catch (failure) {
    span.failed(UNREACHED_STATUS);

    throw failure;
  }
}
