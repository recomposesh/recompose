import type { SpendGrant } from '@recompose/contracts';

import { describe, expect, test, vi } from 'vitest';

import type { BranchRule } from '../routing/policies';
import type { JudgeAsk, JudgeCooling } from './judge-call';

import { requestUrlOf } from '../gateway-router.testkit';
import { readingOfTheJudge } from './judge-call';

const BRANCHES: readonly BranchRule[] = [
  { label: 'code', rule: 'asks to write or change code', child: 'coder' },
  { label: 'chat', rule: 'small talk and questions', child: 'talker' },
];

const NOW = 1_700_000_000_000;

const A_KEYED_JUDGE: SpendGrant = {
  verdict: 'resolved',
  providerOrigin: 'http://judge.test',
  spend: { custody: 'credentialed', provider: 'openai', credential: 'sk-live-40d1' },
};

type Watched = {
  ask: JudgeAsk;
  sentTo: string[];
  bodies: string[];
  cooled: JudgeCooling[];
  aborted: () => boolean;
};

function answering(answer: () => Response | Promise<Response>, grant = A_KEYED_JUDGE): Watched {
  const sentTo: string[] = [];
  const bodies: string[] = [];
  const cooled: JudgeCooling[] = [];
  let cut = false;

  const fetchLike: typeof fetch = async (input, init) => {
    sentTo.push(requestUrlOf(input));
    bodies.push(typeof init?.body === 'string' ? init.body : '');

    const signal = init?.signal;

    return new Promise<Response>((settle, fail) => {
      signal?.addEventListener('abort', () => {
        cut = true;
        fail(new Error('the judge call was cut off'));
      });

      Promise.resolve(answer()).then(settle, fail);
    });
  };

  return {
    sentTo,
    bodies,
    cooled,
    aborted: () => cut,
    ask: {
      grant,
      providerModel: 'gpt-5-mini',
      sourceDialect: 'chat-completions',
      gatewayName: 'Codex',
      virtualModel: 'fast',
      branches: BRANCHES,
      raw: { model: 'fast', messages: [{ role: 'user', content: 'rename this function' }] },
      boundMs: 2_000,
      fetchLike,
      now: () => NOW,
      cool: (cooling) => {
        cooled.push(cooling);
      },
    },
  };
}

function neverAnswering(): Watched {
  return answering(
    async () =>
      new Promise<Response>(() => {
        return;
      }),
  );
}

describe('the reading one classification call earns', () => {
  test('a judge naming a branch reads as that label', async () => {
    const watched = answering(() => Response.json({ choices: [{ message: { content: 'code' } }] }));

    await expect(readingOfTheJudge(watched.ask)).resolves.toEqual({
      heard: 'answer',
      label: 'code',
    });
  });

  test('the call reaches the judge under its own account, at its own origin', async () => {
    const watched = answering(() => Response.json({ choices: [{ message: { content: 'code' } }] }));

    await readingOfTheJudge(watched.ask);

    expect(watched.sentTo).toEqual(['http://judge.test/v1/chat/completions']);
    expect(watched.bodies.at(0)).toContain('gpt-5-mini');
  });

  test('a judge that wrote nothing a label reads from still reads as an answer', async () => {
    const watched = answering(() => Response.json({ id: 'msg_1' }));

    await expect(readingOfTheJudge(watched.ask)).resolves.toEqual({ heard: 'answer', label: '' });
  });

  test('a judge answering something no reader can parse still reads as an answer', async () => {
    const watched = answering(() => new Response('not json at all', { status: 200 }));

    await expect(readingOfTheJudge(watched.ask)).resolves.toEqual({ heard: 'answer', label: '' });
  });
});

describe('the budget one classification call is held to', () => {
  test('a judge that never answers reads as a silence past the budget', async () => {
    const watched = neverAnswering();

    await expect(readingOfTheJudge({ ...watched.ask, boundMs: 20 })).resolves.toEqual({
      heard: 'timeout',
    });
  });

  test('the waiting call is cut off rather than merely stopped waiting for', async () => {
    const watched = neverAnswering();

    await readingOfTheJudge({ ...watched.ask, boundMs: 20 });

    expect(watched.aborted()).toBe(true);
  });

  test('a judge past its budget never stands the judge down', async () => {
    const watched = neverAnswering();

    await readingOfTheJudge({ ...watched.ask, boundMs: 20 });

    expect(watched.cooled).toEqual([]);
  });
});

describe('the trouble a classification call meets', () => {
  test('a rate-limited judge reads as a refusal', async () => {
    const watched = answering(() => new Response('{}', { status: 429 }));

    await expect(readingOfTheJudge(watched.ask)).resolves.toEqual({ heard: 'refusal' });
  });

  test('a rate-limited judge stands down so the next request spends no call on it', async () => {
    const watched = answering(() => new Response('{}', { status: 429 }));

    await readingOfTheJudge(watched.ask);

    expect(watched.cooled).toEqual([{ coolUntilMs: NOW + 60_000 }]);
  });

  test('a judge that promised a wait stands down exactly that long', async () => {
    const watched = answering(
      () => new Response('{}', { status: 429, headers: { 'retry-after': '20' } }),
    );

    await readingOfTheJudge(watched.ask);

    expect(watched.cooled).toEqual([{ coolUntilMs: NOW + 20_000, retryAtMs: NOW + 20_000 }]);
  });

  test('a judge refusing the classification itself never hands that refusal to the caller', async () => {
    const watched = answering(
      () => new Response('{"error":{"message":"bad schema"}}', { status: 400 }),
    );

    await expect(readingOfTheJudge(watched.ask)).resolves.toEqual({ heard: 'refusal' });
  });

  test('a judge that refused a schema it cannot read stands down like any other refusal', async () => {
    const watched = answering(
      () => new Response('{"error":{"message":"bad schema"}}', { status: 400 }),
    );

    await readingOfTheJudge(watched.ask);

    expect(watched.cooled).toEqual([{ coolUntilMs: NOW + 60_000 }]);
  });

  test('a judge nothing could reach reads as a refusal and stands down', async () => {
    const watched = answering(() => {
      throw new Error('the judge connection died');
    });

    await expect(readingOfTheJudge(watched.ask)).resolves.toEqual({ heard: 'refusal' });
    expect(watched.cooled).toEqual([{ coolUntilMs: NOW + 60_000 }]);
  });
});

describe('where the caller’s own words are allowed to land', () => {
  test('the tail reaches the judge and no console line anywhere else', async () => {
    const watched = answering(() => new Response('{}', { status: 500 }));
    const written: unknown[] = [];
    const record = (...parts: unknown[]) => {
      written.push(...parts);
    };
    const errors = vi.spyOn(console, 'error').mockImplementation(record);
    const warnings = vi.spyOn(console, 'warn').mockImplementation(record);
    const logs = vi.spyOn(console, 'log').mockImplementation(record);

    await readingOfTheJudge(watched.ask);

    errors.mockRestore();
    warnings.mockRestore();
    logs.mockRestore();

    expect(watched.bodies.at(0)).toContain('rename this function');
    expect(JSON.stringify(written)).not.toContain('rename this function');
  });
});

describe('a judge whose custody nothing could resolve', () => {
  test('an account that left the registry reads as a refusal with no call leaving the machine', async () => {
    const watched = answering(() => Response.json({}), { verdict: 'missing-target' });

    await expect(readingOfTheJudge(watched.ask)).resolves.toEqual({ heard: 'refusal' });
    expect(watched.sentTo).toEqual([]);
  });

  test('a subscription channel reads as a refusal, because no plan wire carries a classification', async () => {
    const watched = answering(() => Response.json({}), {
      verdict: 'resolved',
      providerOrigin: 'http://judge.test',
      spend: {
        custody: 'subscription',
        provider: 'anthropic',
        accountId: 'plan-1',
        credential: '{}',
        renewal: 'app',
      },
    });

    await expect(readingOfTheJudge(watched.ask)).resolves.toEqual({ heard: 'refusal' });
    expect(watched.sentTo).toEqual([]);
  });

  test('a judge answering with no credential at all still reaches an open runtime', async () => {
    const watched = answering(
      () => Response.json({ choices: [{ message: { content: 'chat' } }] }),
      {
        verdict: 'resolved',
        providerOrigin: 'http://127.0.0.1:11434',
        spend: { custody: 'open' },
      },
    );

    await expect(readingOfTheJudge(watched.ask)).resolves.toEqual({
      heard: 'answer',
      label: 'chat',
    });
  });
});
