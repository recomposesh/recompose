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
 * @summary Only the send sits inside the catch, so a span is never settled twice: a throw from the
 * send closes it and travels on, while everything after it belongs to an answer that did arrive. A
 * span left open shows a person a request still in flight for as long as the process lives, and a
 * cut-off call takes exactly that path, since the signal ends the request rather than answering it.
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

  let answer: Response;

  try {
    answer = await send(provider, request);
  } catch (failure) {
    span.failed(UNREACHED_STATUS);

    throw failure;
  }

  return span.observe(answer);
}
