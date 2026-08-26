import { createServer } from 'node:http';
import { describe, expect, test } from 'vitest';

import type { BrowserSignInPort } from './browser-sign-in-port';

import { antigravityVendor, authorizationUrl, signInToAntigravity } from './antigravity-sign-in';

type Answer = { status: number; body: unknown };

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.href : input.url;
}

type Sent = { url: string; body: string };

/**
 * @summary The exchange, the address lookup and the project lookup are asked for together, so a
 * reading that answered by turn would depend on which of them the runtime happened to start first.
 * Answering by address is what keeps the same reading honest whichever order they land in.
 */
function answerAt(answers: Answers, url: string): Answer {
  for (const [fragment, answer] of Object.entries(answers)) {
    if (url.includes(fragment)) {
      return answer;
    }
  }

  return { status: 404, body: {} };
}

function bodyOf(init: RequestInit | undefined): string {
  return typeof init?.body === 'string' ? init.body : '';
}

type Answers = Readonly<Record<string, Answer>>;

function portAnswering(
  answers: Answers,
  visit: (url: string) => Promise<void>,
): BrowserSignInPort & { sent: Sent[] } {
  const sent: Sent[] = [];

  return {
    sent,
    boundMs: 2_000,
    callbackPortFor: () => readingPort,
    sleep: async () => Promise.resolve(),
    mintState: () => 'state-1',
    openInBrowser: visit,
    fetchLike: async (input, init) => {
      const url = urlOf(input);
      const answer = answerAt(answers, url);

      sent.push({ url, body: bodyOf(init) });

      return Promise.resolve(
        new Response(JSON.stringify(answer.body), {
          status: answer.status,
          headers: { 'content-type': 'application/json' },
        }),
      );
    },
  };
}

/**
 * @summary The port every reading here binds is one this file holds alone, because the one a
 * shipped sign-in uses belongs to whatever else on the machine wants it and a reading that raced
 * for it would fail for a reason that says nothing about the flow.
 */
const readingPort = 51_321;

async function comeBackWith(query: string): Promise<void> {
  await fetch(`http://127.0.0.1:${String(readingPort)}/oauth-callback?${query}`).catch(
    () => undefined,
  );
}

const signedIn: Answers = {
  'oauth2.googleapis.com/token': {
    status: 200,
    body: { access_token: 'goog-token', refresh_token: 'goog-refresh' },
  },
  userinfo: { status: 200, body: { email: 'ada@example.com' } },
  loadCodeAssist: { status: 200, body: { cloudaicompanionProject: 'ada-project' } },
};

describe('the page a person is sent to', () => {
  test('the address names the client, the scopes and the loopback the answer comes back to', () => {
    const asked = new URL(authorizationUrl('state-1', antigravityVendor.callbackPort));

    expect(asked.origin + asked.pathname).toBe(antigravityVendor.auth);
    expect(asked.searchParams.get('client_id')).toBe(antigravityVendor.clientId);
    expect(asked.searchParams.get('state')).toBe('state-1');
    expect(asked.searchParams.get('redirect_uri')).toContain(
      String(antigravityVendor.callbackPort),
    );
    expect(asked.searchParams.get('scope')).toContain('cloud-platform');
  });

  test('the ask is for a renewable grant, so a signed-in plan outlives its first token', () => {
    const asked = new URL(authorizationUrl('state-1', antigravityVendor.callbackPort));

    expect(asked.searchParams.get('access_type')).toBe('offline');
  });
});

describe('the redirect the browser brings back', () => {
  test('a code that came back settles the sign-in and names who signed in', async () => {
    const port = portAnswering(signedIn, async () => comeBackWith('code=abc&state=state-1'));

    const settled = await signInToAntigravity(port);

    expect(settled).toEqual({
      verdict: 'signed-in',
      credential: JSON.stringify({
        type: 'antigravity',
        access_token: 'goog-token',
        refresh_token: 'goog-refresh',
        project_id: 'ada-project',
        email: 'ada@example.com',
      }),
      signedInAs: 'ada@example.com',
    });
  });

  test('a callback carrying somebody else’s word settles nothing', async () => {
    const port = portAnswering(signedIn, async () => comeBackWith('code=abc&state=not-the-one'));

    expect(await signInToAntigravity(port)).toMatchObject({ verdict: 'refused' });
  });

  test('a sign-in denied in the browser refuses rather than waiting out the window', async () => {
    const port = portAnswering(signedIn, async () => comeBackWith('error=access_denied'));

    expect(await signInToAntigravity(port)).toMatchObject({ verdict: 'refused' });
  });

  test('a plan nobody could name still connects, under its plan rather than an address', async () => {
    const port = portAnswering({ ...signedIn, userinfo: { status: 500, body: {} } }, async () =>
      comeBackWith('code=abc&state=state-1'),
    );

    const settled = await signInToAntigravity(port);

    expect(settled).toMatchObject({ verdict: 'signed-in' });
    expect(settled.verdict === 'signed-in' && settled.signedInAs).toBeUndefined();
  });

  test('an exchange that answered no token refuses rather than storing a blank', async () => {
    const port = portAnswering(
      {
        ...signedIn,
        'oauth2.googleapis.com/token': { status: 200, body: { token_type: 'Bearer' } },
      },
      async () => comeBackWith('code=abc&state=state-1'),
    );

    expect(await signInToAntigravity(port)).toMatchObject({ verdict: 'refused' });
  });

  test('the exchange sends back the same loopback the browser was told to return to', async () => {
    const port = portAnswering(signedIn, async () => comeBackWith('code=abc&state=state-1'));

    await signInToAntigravity(port);

    const exchange = port.sent.find((ask) => ask.url === antigravityVendor.token);

    expect(exchange?.body).toContain('code=abc');
    expect(exchange?.body).toContain(String(readingPort));
  });
});

describe('a browser that never came back', () => {
  test('the wait gives the port up rather than holding it for the next sign-in', async () => {
    const quiet: BrowserSignInPort = {
      ...portAnswering(signedIn, async () => Promise.resolve()),
      boundMs: 50,
    };

    expect(await signInToAntigravity(quiet)).toMatchObject({ verdict: 'refused' });

    const second = portAnswering(signedIn, async () => comeBackWith('code=abc&state=state-1'));

    expect(await signInToAntigravity(second)).toMatchObject({ verdict: 'signed-in' });
  });
});

describe('a loopback nothing could hold', () => {
  /**
   * @summary A port another program already listens on is the one case where the app cannot even
   * begin, and a person who reads "denied" for it would go looking in the browser for a refusal
   * that never happened.
   */
  test('a port already held names the port rather than blaming the browser', async () => {
    const held = createServer();

    await new Promise<void>((ready) => {
      held.listen(readingPort, '127.0.0.1', ready);
    });

    try {
      const port = portAnswering(signedIn, async () => Promise.resolve());

      expect(await signInToAntigravity(port)).toEqual({
        verdict: 'refused',
        reason: `Nothing could listen on port ${String(readingPort)}.`,
      });
    } finally {
      await new Promise<void>((shut) => {
        held.close(() => {
          shut();
        });
      });
    }
  });

  test('a second callback after the first settles nothing twice', async () => {
    const port = portAnswering(signedIn, async () => {
      await comeBackWith('code=abc&state=state-1');
      await comeBackWith('code=second&state=state-1');
    });

    const settled = await signInToAntigravity(port);

    expect(settled.verdict === 'signed-in' && settled.credential).toContain('goog-token');
    expect(port.sent.filter((ask) => ask.url === antigravityVendor.token)).toHaveLength(1);
  });
});

describe('an address lookup that answers nothing readable', () => {
  test('a lookup that threw leaves the account unnamed rather than refusing the sign-in', async () => {
    const port = {
      ...portAnswering(signedIn, async () => comeBackWith('code=abc&state=state-1')),
      fetchLike: async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
        const url = urlOf(input);

        if (url.includes('userinfo')) {
          return Promise.reject(new Error('the network is down'));
        }

        return portAnswering(signedIn, async () => Promise.resolve()).fetchLike(input, init);
      },
    };

    const settled = await signInToAntigravity(port);

    expect(settled).toMatchObject({ verdict: 'signed-in' });
    expect(settled.verdict === 'signed-in' && settled.signedInAs).toBeUndefined();
  });

  test('a token answer that is no record at all refuses rather than reading fields off it', async () => {
    const port = portAnswering(
      { ...signedIn, 'oauth2.googleapis.com/token': { status: 200, body: 'a sentence' } },
      async () => comeBackWith('code=abc&state=state-1'),
    );

    expect(await signInToAntigravity(port)).toEqual({
      verdict: 'refused',
      reason: 'Google did not answer the sign-in this app started.',
    });
  });

  test('an account Google names no project for refuses rather than storing a dead credential', async () => {
    const port = portAnswering(
      { ...signedIn, loadCodeAssist: { status: 500, body: {} } },
      async () => comeBackWith('code=abc&state=state-1'),
    );

    expect(await signInToAntigravity(port)).toEqual({
      verdict: 'refused',
      reason: 'Google named no Antigravity project for this account.',
    });
  });
});
