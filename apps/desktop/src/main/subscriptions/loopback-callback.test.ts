import { describe, expect, test } from 'vitest';

import { awaitLoopbackCallback, loopbackRedirectUri } from './loopback-callback';

const LISTENING_PORT = 39_741;

async function visited(port: number, path: string, query: string): Promise<Response> {
  return fetch(`http://127.0.0.1:${String(port)}${path}?${query}`);
}

async function holdingThePort(state: string, boundMs: number) {
  return awaitLoopbackCallback({
    state,
    boundMs,
    callbackPort: LISTENING_PORT,
    path: '/auth/callback',
  });
}

describe('the address a vendor is told to send the browser back to', () => {
  test('the redirect names the loopback, the port held, and the path the vendor registered', () => {
    expect(loopbackRedirectUri(1_455, '/auth/callback')).toBe(
      'http://localhost:1455/auth/callback',
    );
  });

  test('two vendors registering two paths get two addresses on their own ports', () => {
    expect(loopbackRedirectUri(51_121, '/oauth-callback')).toBe(
      'http://localhost:51121/oauth-callback',
    );
  });
});

describe('holding the loopback port until the browser comes back', () => {
  test('given a callback carrying the code and the word that was sent, the code is handed over', async () => {
    const listening = holdingThePort('word-1', 2_000);

    await visited(LISTENING_PORT, '/auth/callback', 'code=the-code&state=word-1');

    expect(await listening).toEqual({ code: 'the-code' });
  });

  test('given a callback carrying somebody else\u2019s word, nothing is handed over', async () => {
    const listening = holdingThePort('word-1', 2_000);

    await visited(LISTENING_PORT, '/auth/callback', 'code=the-code&state=somebody-else');

    expect(await listening).toEqual({
      reason: 'The browser came back without the code this sign-in asked for.',
    });
  });

  test('given a browser that was denied, the refusal says the sign-in was denied', async () => {
    const listening = holdingThePort('word-1', 2_000);

    await visited(LISTENING_PORT, '/auth/callback', 'error=access_denied&state=word-1');

    expect(await listening).toEqual({ reason: 'The sign-in was denied in the browser.' });
  });

  test('the browser is told it may close, so nobody sits on a blank page', async () => {
    const listening = holdingThePort('word-1', 2_000);

    const answered = await visited(LISTENING_PORT, '/auth/callback', 'code=c&state=word-1');

    expect(await answered.text()).toContain('You can close this tab');

    await listening;
  });
});

describe('a browser that never came back', () => {
  test('given nobody ever comes back, the wait ends of its own accord', async () => {
    expect(await holdingThePort('word-1', 30)).toEqual({
      reason: 'The sign-in was not finished in the browser in time.',
    });
  });

  test('given the port is let go of, the next sign-in can hold it again', async () => {
    await holdingThePort('word-1', 30);

    const second = holdingThePort('word-2', 2_000);

    await visited(LISTENING_PORT, '/auth/callback', 'code=second-code&state=word-2');

    expect(await second).toEqual({ code: 'second-code' });
  });
});
