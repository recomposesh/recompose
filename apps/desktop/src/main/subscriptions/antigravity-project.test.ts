import { describe, expect, test } from 'vitest';

import type { ProjectLookupPort } from './antigravity-project';

import { antigravityProjectFor } from './antigravity-project';

type Answer = { status: number; body: unknown };

type Answers = Readonly<Record<string, readonly Answer[]>>;

const nothingThere: Answer = { status: 404, body: {} };

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') {
    return input;
  }

  return input instanceof URL ? input.href : input.url;
}

function answerAt(answers: Answers, url: string, turn: number): Answer {
  const matched = Object.entries(answers).find(([fragment]) => url.includes(fragment))?.[1];

  return matched === undefined
    ? nothingThere
    : (matched[Math.min(turn, matched.length - 1)] ?? nothingThere);
}

type Asked = { url: string; body: string; headers: Record<string, string> };

function portAnswering(answers: Answers): ProjectLookupPort & {
  asked: Asked[];
  waited: number[];
} {
  const asked: Asked[] = [];
  const waited: number[] = [];
  const turns = new Map<string, number>();

  return {
    asked,
    waited,
    sleep: async (ms) => {
      waited.push(ms);

      return Promise.resolve();
    },
    fetchLike: async (input, init) => {
      const url = urlOf(input);
      const turn = turns.get(url) ?? 0;
      const answer = answerAt(answers, url, turn);

      turns.set(url, turn + 1);
      asked.push({
        url,
        body: typeof init?.body === 'string' ? init.body : '',
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
      });

      return Promise.resolve(
        new Response(JSON.stringify(answer.body), {
          status: answer.status,
          headers: { 'content-type': 'application/json' },
        }),
      );
    },
  };
}

const loadCodeAssist = 'https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist';

const onboardUser = 'https://daily-cloudcode-pa.googleapis.com/v1internal:onboardUser';

describe('the project an account already has', () => {
  test('the ask names the tool Google issues this plan for', async () => {
    const port = portAnswering({
      loadCodeAssist: [{ status: 200, body: { cloudaicompanionProject: 'ada-project' } }],
    });

    await antigravityProjectFor(port, 'goog-token');

    expect(port.asked[0]?.url).toBe(loadCodeAssist);
    expect(port.asked[0]?.body).toContain('ANTIGRAVITY');
    expect(port.asked[0]?.headers['authorization']).toBe('Bearer goog-token');
  });

  test('a project named plainly is the one the account serves through', async () => {
    const port = portAnswering({
      loadCodeAssist: [{ status: 200, body: { cloudaicompanionProject: 'ada-project' } }],
    });

    await expect(antigravityProjectFor(port, 'goog-token')).resolves.toBe('ada-project');
  });

  test('a project named as a record is read out of it rather than missed', async () => {
    const port = portAnswering({
      loadCodeAssist: [
        { status: 200, body: { cloudaicompanionProject: { id: 'nested-project' } } },
      ],
    });

    await expect(antigravityProjectFor(port, 'goog-token')).resolves.toBe('nested-project');
  });

  test('a project under either of the other two names is read the same way', async () => {
    for (const key of ['projectId', 'project']) {
      const port = portAnswering({ loadCodeAssist: [{ status: 200, body: { [key]: 'p-1' } }] });

      await expect(antigravityProjectFor(port, 'goog-token'), key).resolves.toBe('p-1');
    }
  });

  test('a lookup nobody answered leaves the sign-in with nothing to store', async () => {
    const port = portAnswering({ loadCodeAssist: [{ status: 500, body: {} }] });

    await expect(antigravityProjectFor(port, 'goog-token')).resolves.toBeUndefined();
    expect(port.asked).toHaveLength(1);
  });
});

describe('the project a first sign-in has to be onboarded for', () => {
  const noProjectYet = {
    status: 200,
    body: { allowedTiers: [{ id: 'free-tier' }, { id: 'paid-tier', isDefault: true }] },
  };

  test('an account with no project yet is onboarded onto the tier Google marks default', async () => {
    const port = portAnswering({
      loadCodeAssist: [noProjectYet],
      onboardUser: [
        { status: 200, body: { done: true, response: { cloudaicompanionProject: 'p' } } },
      ],
    });

    await expect(antigravityProjectFor(port, 'goog-token')).resolves.toBe('p');

    const onboarding = port.asked.find((ask) => ask.url === onboardUser);

    expect(onboarding?.body).toContain('paid-tier');
  });

  test('an onboarding still running is waited out rather than read as having no project', async () => {
    const port = portAnswering({
      loadCodeAssist: [noProjectYet],
      onboardUser: [
        { status: 200, body: { done: false } },
        { status: 200, body: { done: true, response: { cloudaicompanionProject: 'p' } } },
      ],
    });

    await expect(antigravityProjectFor(port, 'goog-token')).resolves.toBe('p');
    expect(port.waited).toEqual([2_000]);
  });

  test('an onboarding that never completes gives up rather than polling behind a shut screen', async () => {
    const port = portAnswering({
      loadCodeAssist: [noProjectYet],
      onboardUser: [{ status: 200, body: { done: false } }],
    });

    await expect(antigravityProjectFor(port, 'goog-token')).resolves.toBeUndefined();
    expect(port.asked.filter((ask) => ask.url === onboardUser)).toHaveLength(5);
  });

  test('an onboarding the far end refused stops rather than asking four more times', async () => {
    const port = portAnswering({
      loadCodeAssist: [noProjectYet],
      onboardUser: [{ status: 403, body: {} }],
    });

    await expect(antigravityProjectFor(port, 'goog-token')).resolves.toBeUndefined();
    expect(port.asked.filter((ask) => ask.url === onboardUser)).toHaveLength(1);
  });
});

const nothingAsked: Asked = { url: '', body: '', headers: {} };

describe('how each ask names the tool Google issues this plan for', () => {
  test('the project lookup carries the Antigravity agent rather than a bare client', async () => {
    const port = portAnswering({
      loadCodeAssist: [{ status: 200, body: { cloudaicompanionProject: 'p' } }],
    });

    await antigravityProjectFor(port, 'goog-token');

    expect(port.asked[0]?.headers['user-agent']).toContain('antigravity');
  });

  test('the onboarding names the caller Google checks for, and the tool it onboards', async () => {
    const port = portAnswering({
      loadCodeAssist: [{ status: 200, body: { allowedTiers: [{ id: 'free-tier' }] } }],
      onboardUser: [{ status: 200, body: { done: true, response: { projectId: 'p' } } }],
    });

    await antigravityProjectFor(port, 'goog-token');

    const onboarding = port.asked.find((ask) => ask.url === onboardUser) ?? nothingAsked;

    expect(onboarding.headers['x-goog-api-client']).not.toBe(undefined);
    expect(onboarding.headers['user-agent']).toContain('antigravity');
    expect(onboarding.body).toContain('ANTIGRAVITY');
    expect(onboarding.body).toContain('ide_name');
    expect(onboarding.body).toContain('ide_version');
  });
});

describe('the tier an onboarding runs under', () => {
  const onboards = [{ status: 200, body: { done: true, response: { projectId: 'p' } } }];

  async function tierAskedFor(loaded: unknown): Promise<string> {
    const port = portAnswering({
      loadCodeAssist: [{ status: 200, body: loaded }],
      onboardUser: onboards,
    });

    await antigravityProjectFor(port, 'goog-token');

    return port.asked.find((ask) => ask.url === onboardUser)?.body ?? '';
  }

  test('the tier Google marks default is the one the onboarding names', async () => {
    const body = await tierAskedFor({
      allowedTiers: [{ id: 'free-tier' }, { id: 'paid-tier', isDefault: true }],
    });

    expect(body).toContain('paid-tier');
  });

  test('an answer marking no default falls back rather than onboarding onto a guess', async () => {
    const body = await tierAskedFor({ allowedTiers: [{ id: 'paid-tier' }] });

    expect(body).toContain('free-tier');
  });

  test('an answer naming no tiers at all falls back the same way', async () => {
    expect(await tierAskedFor({})).toContain('free-tier');
  });

  test('a tier list holding things that are no tier falls back rather than reading them', async () => {
    const body = await tierAskedFor({ allowedTiers: ['paid-tier', 7, null] });

    expect(body).toContain('free-tier');
  });

  test('a default whose id is blank falls back rather than onboarding onto nothing', async () => {
    const body = await tierAskedFor({ allowedTiers: [{ id: '   ', isDefault: true }] });

    expect(body).toContain('free-tier');
  });
});

describe('what an onboarding answers with', () => {
  test('a completed onboarding naming no project answers with nothing', async () => {
    const port = portAnswering({
      loadCodeAssist: [{ status: 200, body: { allowedTiers: [] } }],
      onboardUser: [{ status: 200, body: { done: true, response: {} } }],
    });

    await expect(antigravityProjectFor(port, 'goog-token')).resolves.toBeUndefined();
  });

  test('a completed onboarding carrying no answer at all answers with nothing', async () => {
    const port = portAnswering({
      loadCodeAssist: [{ status: 200, body: { allowedTiers: [] } }],
      onboardUser: [{ status: 200, body: { done: true } }],
    });

    await expect(antigravityProjectFor(port, 'goog-token')).resolves.toBeUndefined();
  });

  test('a blank project reads as no project rather than as one named by nothing', async () => {
    const port = portAnswering({
      loadCodeAssist: [{ status: 200, body: { cloudaicompanionProject: '   ' } }],
      onboardUser: [{ status: 200, body: { done: true, response: { projectId: 'onboarded' } } }],
    });

    await expect(antigravityProjectFor(port, 'goog-token')).resolves.toBe('onboarded');
  });
});
