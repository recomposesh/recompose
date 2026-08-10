import { expect, test } from 'vitest';

import { withXaiRetryAfter } from './xai-response';

test('free xAI usage exhaustion carries a 24-hour retry delay', async () => {
  const response = Response.json(
    { code: 'subscription:free-usage-exhausted', error: 'free usage exhausted' },
    { status: 429 },
  );
  const decorated = await withXaiRetryAfter(response);

  expect(decorated.status).toBe(429);
  expect(decorated.headers.get('retry-after')).toBe('86400');
});

test.each([
  [429, { code: 'rate_limit', error: 'too many requests' }],
  [400, { error: 'nope' }],
] as const)('does not invent retry metadata for status %s', async (status, body) => {
  const response = Response.json(body, { status });
  const decorated = await withXaiRetryAfter(response);

  expect(decorated).toBe(response);
  expect(decorated.headers.get('retry-after')).toBeNull();
});

test.each([
  ['a bad-credentials code', { code: 'unauthenticated:bad-credentials', error: 'invalid token' }],
  [
    'an unvalidated access token message',
    { error: { message: 'The OAuth2 access token could not be validated.' } },
  ],
] as const)('an xAI 403 naming %s is answered as unauthorized', async (_signature, body) => {
  const response = Response.json(body, { status: 403, headers: { 'x-request-id': 'req-1' } });
  const remapped = await withXaiRetryAfter(response);

  expect(remapped.status).toBe(401);
  expect(remapped.headers.get('x-request-id')).toBe('req-1');
  await expect(remapped.json()).resolves.toEqual(body);
});

test('an xAI 403 naming bad credentials in another casing is answered as unauthorized', async () => {
  const response = Response.json({ code: 'Unauthenticated:BAD-CREDENTIALS' }, { status: 403 });

  await expect(withXaiRetryAfter(response)).resolves.toHaveProperty('status', 401);
});

test('a credential failure reported under any other status keeps that status', async () => {
  const response = Response.json({ code: 'unauthenticated:bad-credentials' }, { status: 500 });

  await expect(withXaiRetryAfter(response)).resolves.toBe(response);
});

test('an xAI 403 that names no credential failure keeps its status', async () => {
  const response = Response.json({ error: { code: 'permission_denied' } }, { status: 403 });

  await expect(withXaiRetryAfter(response)).resolves.toBe(response);
});

test('an xAI 403 without a body keeps its status', async () => {
  const response = new Response(null, { status: 403 });

  await expect(withXaiRetryAfter(response)).resolves.toBe(response);
});

test('an xAI 403 whose body cannot be read keeps its status', async () => {
  const unreadable = new ReadableStream({
    start(controller) {
      controller.error(new Error('upstream closed the body'));
    },
  });
  const response = new Response(unreadable, { status: 403 });

  await expect(withXaiRetryAfter(response)).resolves.toBe(response);
});

test('free usage exhaustion reported under any other status carries no retry delay', async () => {
  const response = Response.json({ code: 'subscription:free-usage-exhausted' }, { status: 402 });
  const decorated = await withXaiRetryAfter(response);

  expect(decorated).toBe(response);
  expect(decorated.headers.get('retry-after')).toBeNull();
});
