import { describe, expect, test } from 'vitest';

import { refusalStatusRestated } from './refusal-status';

const groqTpmRefusal = {
  error: {
    message:
      'Request too large for model `qwen/qwen3.6-27b` in organization `org_1` service tier ' +
      '`on_demand` on tokens per minute (TPM): Limit 8000, Requested 16396, please reduce your ' +
      'message size and try again',
    type: 'tokens',
    code: 'rate_limit_exceeded',
  },
};

function refusedWith(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

describe('a refusal whose status misreads its own body', () => {
  test('a tokens-per-minute refusal sent as 413 is restated as the rate limit it is', async () => {
    const restated = await refusalStatusRestated(refusedWith(413, groqTpmRefusal));

    expect(restated.status).toBe(429);
  });

  test('the vendor own words reach the caller unchanged', async () => {
    const restated = await refusalStatusRestated(refusedWith(413, groqTpmRefusal));

    expect(await restated.json()).toEqual(groqTpmRefusal);
  });

  test('the headers the vendor set survive, so a retry-after is still read', async () => {
    const restated = await refusalStatusRestated(
      refusedWith(413, groqTpmRefusal, { 'retry-after': '30' }),
    );

    expect(restated.headers.get('retry-after')).toBe('30');
  });

  test('a 413 about real size is left as it was sent', async () => {
    const oversized = { error: { message: 'request body too large', type: 'invalid_request' } };
    const restated = await refusalStatusRestated(refusedWith(413, oversized));

    expect(restated.status).toBe(413);
  });

  test('a quota refusal reads as a rate limit whatever word the vendor chose', async () => {
    const quota = { error: { message: 'You exceeded your current quota', code: 'insufficient' } };

    expect((await refusalStatusRestated(refusedWith(413, quota))).status).toBe(429);
  });

  test('every other status is handed on untouched', async () => {
    for (const status of [200, 400, 401, 429, 500]) {
      const answer = refusedWith(status, groqTpmRefusal);

      expect((await refusalStatusRestated(answer)).status).toBe(status);
    }
  });

  test('a 413 carrying no readable body is left alone rather than guessed at', async () => {
    const restated = await refusalStatusRestated(new Response('not json', { status: 413 }));

    expect(restated.status).toBe(413);
  });
});
