import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';

import type { BrowserSignInPort, BrowserSignInSettled } from './browser-sign-in-port';

import { codexVendor, signInToCodex } from './codex-sign-in';

const CALLBACK_PORT = 39_755;

function jwtCarrying(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');

  return `header.${payload}.signature`;
}

const anIdentityToken = jwtCarrying({
  email: 'ada@example.com',
  'https://api.openai.com/auth': { chatgpt_account_id: 'acct-42', chatgpt_plan_type: 'pro' },
});

type Answer = { status: number; body: unknown };

type Sent = { url: string; body: string };

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.href : input.url;
}

function portAnswering(answer: Answer, visit: (url: string) => Promise<void>) {
  const sent: Sent[] = [];

  const port: BrowserSignInPort = {
    boundMs: 2_000,
    callbackPortFor: () => CALLBACK_PORT,
    sleep: async () => Promise.resolve(),
    mintState: () => 'state-1',
    openInBrowser: visit,
    fetchLike: async (input, init) => {
      sent.push({
        url: urlOf(input),
        body: typeof init?.body === 'string' ? init.body : '',
      });

      return Promise.resolve(
        new Response(JSON.stringify(answer.body), {
          status: answer.status,
          headers: { 'content-type': 'application/json' },
        }),
      );
    },
  };

  return { port, sent };
}

const aTokenAnswer: Answer = {
  status: 200,
  body: {
    access_token: 'codex-access',
    refresh_token: 'codex-refresh',
    id_token: anIdentityToken,
    expires_in: 3_600,
  },
};

function browserVisiting(carry: (opened: URL) => string) {
  return async (opened: string) => {
    const asked = new URL(opened);

    await fetch(`http://127.0.0.1:${String(CALLBACK_PORT)}/auth/callback?${carry(asked)}`);
  };
}

const withTheCode = browserVisiting(
  (opened) => `code=the-code&state=${opened.searchParams.get('state') ?? ''}`,
);

async function settledSignIn(answer: Answer = aTokenAnswer) {
  const { port, sent } = portAnswering(answer, withTheCode);
  const settled = await signInToCodex(port);

  return { settled, sent };
}

async function askedDuringSignIn(): Promise<{ asked: URL; sent: readonly Sent[] }> {
  const opened: string[] = [];
  const { port, sent } = portAnswering(aTokenAnswer, async (url) => {
    opened.push(url);

    await withTheCode(url);
  });

  await signInToCodex(port);

  return { asked: new URL(opened[0] ?? ''), sent };
}

describe('the address a Codex sign-in sends a person to', () => {
  test('given a sign-in begins, the browser opens on OpenAI\u2019s own authorization page', async () => {
    const { asked } = await askedDuringSignIn();

    expect(asked.href).toContain('https://auth.openai.com/oauth/authorize');
  });

  test('the ask names the public client OpenAI ships, and asks to come back to the loopback', async () => {
    const { asked } = await askedDuringSignIn();

    expect(asked.searchParams.get('client_id')).toBe('app_EMoamEEZ73f0CkXaXp7hrann');
    expect(asked.searchParams.get('redirect_uri')).toBe(
      `http://localhost:${String(CALLBACK_PORT)}/auth/callback`,
    );
    expect(asked.searchParams.get('response_type')).toBe('code');
  });

  test('the ask carries the scope, the state, and the two flags Codex\u2019s own flow sets', async () => {
    const { asked } = await askedDuringSignIn();

    expect(asked.searchParams.get('scope')).toBe('openid email profile offline_access');
    expect(asked.searchParams.get('state')).toBe('state-1');
    expect(asked.searchParams.get('id_token_add_organizations')).toBe('true');
    expect(asked.searchParams.get('codex_cli_simplified_flow')).toBe('true');
  });
});

describe('the proof that binds one sign-in to its own exchange', () => {
  test('the ask carries the hash of a word only this run holds', async () => {
    const { asked } = await askedDuringSignIn();

    expect(asked.searchParams.get('code_challenge_method')).toBe('S256');
    expect(asked.searchParams.get('code_challenge')).not.toBe('');
  });

  test('the word the exchange sends is the one the authorization address was hashed from', async () => {
    const { asked, sent } = await askedDuringSignIn();
    const verifier = verifierIn(sent);

    expect(createHash('sha256').update(verifier).digest('base64url')).toBe(
      asked.searchParams.get('code_challenge'),
    );
  });

  test('no sign-in reuses another\u2019s word, so a stolen address buys nothing', async () => {
    const one = await settledSignIn();
    const two = await settledSignIn();

    expect(verifierIn(one.sent)).not.toBe(verifierIn(two.sent));
  });
});

function verifierIn(sent: readonly Sent[]): string {
  return new URLSearchParams(sent[0]?.body ?? '').get('code_verifier') ?? '';
}

type KeptRecord = { tokens?: Record<string, unknown> };

function keptRecordIn(settled: BrowserSignInSettled): KeptRecord {
  if (settled.verdict !== 'signed-in') {
    throw new Error('the sign-in refused where a settled credential was expected');
  }

  const read: unknown = JSON.parse(settled.credential);

  if (typeof read !== 'object' || read === null) {
    throw new Error('the credential did not read as a record');
  }

  return read;
}

describe('the exchange that turns the code into a credential', () => {
  test('the exchange lands on OpenAI’s token endpoint, naming the same redirect it asked for', async () => {
    const { sent } = await settledSignIn();
    const body = new URLSearchParams(sent[0]?.body ?? '');

    expect(sent[0]?.url).toBe('https://auth.openai.com/oauth/token');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('the-code');
    expect(body.get('redirect_uri')).toBe(
      `http://localhost:${String(CALLBACK_PORT)}/auth/callback`,
    );
  });
});

describe('what a settled Codex sign-in is kept as', () => {
  test('given OpenAI answers, the account reads as the address inside the identity token', async () => {
    const { settled } = await settledSignIn();

    expect(settled).toMatchObject({ verdict: 'signed-in', signedInAs: 'ada@example.com' });
  });

  test('the credential is written in the shape Codex’s own record uses', async () => {
    const { settled } = await settledSignIn();

    expect(keptRecordIn(settled)).toMatchObject({
      tokens: {
        access_token: 'codex-access',
        refresh_token: 'codex-refresh',
        id_token: anIdentityToken,
        account_id: 'acct-42',
      },
    });
  });

  test('the account the plan bills against comes from the identity token, never from a guess', async () => {
    const { settled } = await settledSignIn({
      status: 200,
      body: {
        access_token: 'codex-access',
        refresh_token: 'codex-refresh',
        id_token: jwtCarrying({
          email: 'grace@example.com',
          'https://api.openai.com/auth': { chatgpt_account_id: 'acct-99' },
        }),
        expires_in: 3_600,
      },
    });

    expect(keptRecordIn(settled).tokens?.['account_id']).toBe('acct-99');
    expect(settled).toMatchObject({ signedInAs: 'grace@example.com' });
  });

  test('the record carries no API key, so it never reads as a Codex signed out into key mode', async () => {
    const { settled } = await settledSignIn();

    expect(Object.keys(keptRecordIn(settled))).not.toContain('OPENAI_API_KEY');
  });

  test('an identity token naming nobody still connects, under the plan’s own name', async () => {
    const { settled } = await settledSignIn({
      status: 200,
      body: { access_token: 'codex-access', refresh_token: 'codex-refresh', expires_in: 3_600 },
    });

    expect(settled).toMatchObject({ verdict: 'signed-in' });
    expect(settled.verdict === 'signed-in' && settled.signedInAs).toBeUndefined();
  });
});

describe('a sign-in that never lands', () => {
  test('given OpenAI answers without a token, the sign-in refuses rather than keeping nothing', async () => {
    const { settled } = await settledSignIn({ status: 200, body: { error: 'invalid_grant' } });

    expect(settled).toEqual({
      verdict: 'refused',
      reason: 'OpenAI answered the sign-in without a token.',
    });
  });

  test('given the browser never comes back, the sign-in says so rather than waiting forever', async () => {
    const { port } = portAnswering(aTokenAnswer, async () => Promise.resolve());
    const settled = await signInToCodex({ ...port, boundMs: 30 });

    expect(settled).toEqual({
      verdict: 'refused',
      reason: 'The sign-in was not finished in the browser in time.',
    });
  });

  test('given the browser comes back under somebody else’s word, nothing is exchanged', async () => {
    const { port, sent } = portAnswering(
      aTokenAnswer,
      browserVisiting(() => 'code=the-code&state=somebody-else'),
    );

    const settled = await signInToCodex(port);

    expect(settled.verdict).toBe('refused');
    expect(sent).toEqual([]);
  });
});

describe('the vendor Codex’s sign-in runs against', () => {
  test('the loopback port is the one OpenAI registered for this client', () => {
    expect(codexVendor.callbackPort).toBe(1_455);
    expect(codexVendor.callbackPath).toBe('/auth/callback');
  });
});
