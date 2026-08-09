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

export async function withXaiRetryAfter(response: Response): Promise<Response> {
  if (response.status === 403) return asUnauthorized(response);
  if (response.status !== 429) return response;

  return withFreeUsageDelay(response);
}
