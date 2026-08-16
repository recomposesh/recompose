import { urlOf } from '../asked-url.testkit';

type SentRequest = { url: string; init: RequestInit };

/** A fetch that answers every look the same way and keeps what was asked of it. */
export function fetchAnswering(
  status: number,
  body: string | null,
): { sent: SentRequest[]; fetchLike: typeof fetch } {
  const sent: SentRequest[] = [];

  const fetchLike: typeof fetch = async (input, init) => {
    sent.push({ url: urlOf(input), init: init ?? {} });

    return Promise.resolve(new Response(body, { status }));
  };

  return { sent, fetchLike };
}

/**
 * The one request a look was expected to make, refusing anything else.
 *
 * @summary A look that reached the vendor twice, or not at all, is a different behavior than the
 * one under test, so it fails here rather than letting an assertion read the first of several.
 */
export function onlyRequestOf(sent: SentRequest[]): SentRequest {
  const request = sent[0];

  if (request === undefined || sent.length !== 1) {
    throw new Error('expected exactly one request to leave the look');
  }

  return request;
}

export function headersOf(request: SentRequest): Headers {
  return new Headers(request.init.headers);
}
