import { isJsonObject } from '../gateway-wire';

const FREE_USAGE_EXHAUSTED = 'subscription:free-usage-exhausted';
const BAD_CREDENTIAL_SIGNATURES = ['bad-credentials', 'access token could not be validated'];

function freeUsageExhausted(value: unknown): boolean {
  return isJsonObject(value) && value['code'] === FREE_USAGE_EXHAUSTED;
}

export function namesXaiBadCredentials(body: string): boolean {
  const lowered = body.toLowerCase();

  return BAD_CREDENTIAL_SIGNATURES.some((signature) => lowered.includes(signature));
}

async function asUnauthorized(response: Response): Promise<Response> {
  const body = await response
    .clone()
    .text()
    .catch(() => '');

  if (!namesXaiBadCredentials(body)) return response;

  return new Response(response.body, { status: 401, headers: new Headers(response.headers) });
}

async function withFreeUsageDelay(response: Response): Promise<Response> {
  const body = await response
    .clone()
    .json()
    .catch(() => undefined);

  if (!freeUsageExhausted(body)) return response;

  const headers = new Headers(response.headers);

  headers.set('retry-after', String(24 * 60 * 60));

  return new Response(response.body, { status: response.status, headers });
}

/**
 * An xAI refusal, read as what it means rather than as what it said.
 *
 * @summary xAI answers two things in words the rest of the engine would act on wrongly. A rejected
 * credential comes back 403, which reads as a permission the account lacks rather than a key to
 * replace, so it becomes 401. Exhausted free usage comes back 429 with no `retry-after`, which
 * reads as a rate limit to try again in a moment rather than a day, so it gets the day.
 *
 * Every other answer passes through untouched.
 */
export async function asXaiRefusalReads(response: Response): Promise<Response> {
  if (response.status === 403) return asUnauthorized(response);
  if (response.status !== 429) return response;

  return withFreeUsageDelay(response);
}
