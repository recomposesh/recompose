import { PROVIDER_MESSAGE_SPAN } from '@recompose/contracts';

function wordOf(body: unknown): string | undefined {
  if (typeof body !== 'string') {
    return undefined;
  }

  const spoken = body.trim().slice(0, PROVIDER_MESSAGE_SPAN).trim();

  return spoken === '' ? undefined : spoken;
}

function spokenInside(body: object): string | undefined {
  const underError = 'error' in body ? messageTheProviderSent(body.error) : undefined;

  return underError ?? ('message' in body ? messageTheProviderSent(body.message) : undefined);
}

/**
 * Where a provider puts the sentence explaining a refusal, read out of the answer it sent.
 *
 * @summary Five dialects bury the same sentence in three shapes, so the search for it is written
 * once and every surface that quotes a provider asks here. The error wrapper outranks a top-level
 * message, because a body carrying both states the request's own outcome at the top and the reason
 * it failed underneath. What each caller then does with the sentence differs: a cable prints it as
 * it stands, while a row admits it only through the contract's own reading.
 */
export function messageTheProviderSent(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) {
    return wordOf(body);
  }

  return spokenInside(body);
}
