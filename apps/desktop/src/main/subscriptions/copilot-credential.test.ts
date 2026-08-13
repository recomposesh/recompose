import { describe, expect, test } from 'vitest';

import { buyACopilotToken, copilotApi, signedInAs } from './copilot-credential';

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.href : input.url;
}

function fetchAnswering(status: number, body: unknown) {
  const sent: { url: string; headers: Record<string, string>; method: string }[] = [];

  const fetchLike: typeof fetch = async (input, init) => {
    sent.push({
      url: urlOf(input),
      headers: Object.fromEntries(Object.entries(init?.headers ?? {})),
      method: init?.method ?? '',
    });

    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  };

  return { sent, fetchLike };
}

describe('the short-lived credential a turn is spent with', () => {
  test('the trade asks the endpoint that mints one, carrying the long-lived credential', async () => {
    const { sent, fetchLike } = fetchAnswering(200, { token: 'tid=x;exp=1', expires_at: 1_000 });

    await buyACopilotToken(fetchLike, 'gho_the-token');

    expect(sent[0]?.url).toBe(copilotApi.token);
    expect(sent[0]?.headers['authorization']).toBe('token gho_the-token');
  });

  test('a minted credential carries the moment it stops working', async () => {
    const { fetchLike } = fetchAnswering(200, { token: 'tid=x;exp=1', expires_at: 1_700_000_000 });

    expect(await buyACopilotToken(fetchLike, 'gho_the-token')).toEqual({
      verdict: 'minted',
      credential: 'tid=x;exp=1',
      expiresAtMs: 1_700_000_000_000,
    });
  });

  test('an answer carrying no credential refuses rather than serving an empty one', async () => {
    const { fetchLike } = fetchAnswering(200, { expires_at: 1_700_000_000 });

    expect(await buyACopilotToken(fetchLike, 'gho_the-token')).toEqual({
      verdict: 'refused',
      reason: 'GitHub did not mint a Copilot credential for this account.',
    });
  });

  test('a refused trade says so rather than throwing at the turn that needed it', async () => {
    const { fetchLike } = fetchAnswering(401, {});

    expect((await buyACopilotToken(fetchLike, 'gho_stale')).verdict).toBe('refused');
  });
});

describe('what a trade refuses to read', () => {
  test('the trade reads rather than writes, so it never posts a credential', async () => {
    const { sent, fetchLike } = fetchAnswering(200, { token: 'tid=x', expires_at: 1 });

    await buyACopilotToken(fetchLike, 'gho_the-token');

    expect(sent[0]?.method).toBe('GET');
  });

  test('an answer that is no object at all refuses rather than reading fields off it', async () => {
    for (const body of ['a sentence', 42, null]) {
      const { fetchLike } = fetchAnswering(200, body);

      expect((await buyACopilotToken(fetchLike, 'gho_the-token')).verdict, String(body)).toBe(
        'refused',
      );
    }
  });

  test('a credential that arrived blank refuses rather than being spent', async () => {
    const { fetchLike } = fetchAnswering(200, { token: '   ', expires_at: 1 });

    expect((await buyACopilotToken(fetchLike, 'gho_the-token')).verdict).toBe('refused');
  });

  test('an expiry that is no number reads as already lapsed rather than as forever', async () => {
    const { fetchLike } = fetchAnswering(200, { token: 'tid=x', expires_at: 'soon' });

    expect(await buyACopilotToken(fetchLike, 'gho_the-token')).toEqual({
      verdict: 'minted',
      credential: 'tid=x',
      expiresAtMs: 0,
    });
  });
});

describe('who signed in', () => {
  test('the look asks the account endpoint with the long-lived credential', async () => {
    const { sent, fetchLike } = fetchAnswering(200, { login: 'someone' });

    await signedInAs(fetchLike, 'gho_the-token');

    expect(sent[0]?.url).toBe(copilotApi.user);
    expect(sent[0]?.headers['authorization']).toBe('token gho_the-token');
  });

  test('a login answers, so the row names an account rather than standing anonymous', async () => {
    const { fetchLike } = fetchAnswering(200, { login: 'someone' });

    expect(await signedInAs(fetchLike, 'gho_the-token')).toBe('someone');
  });

  test('a look that answers nothing leaves the row to name itself', async () => {
    const { fetchLike } = fetchAnswering(500, {});

    expect(await signedInAs(fetchLike, 'gho_the-token')).toBeUndefined();
  });
});
