import { describe, expect, test, vi } from 'vitest';

import { readingOfTheJudge } from './judge-call';
import { answering, answeringWithASeveredBody, NOW, neverAnswering } from './judge-call.testkit';

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

  test('a judge answering something no reader can parse reads as a refusal', async () => {
    const watched = answering(() => new Response('not json at all', { status: 200 }));

    await expect(readingOfTheJudge(watched.ask)).resolves.toEqual({ heard: 'refusal' });
  });

  test('a judge whose answer no reader can parse stands down like any other refusal', async () => {
    const watched = answering(() => new Response('not json at all', { status: 200 }));

    await readingOfTheJudge(watched.ask);

    expect(watched.cooled).toEqual([{ coolUntilMs: NOW + 60_000 }]);
  });

  test('an empty body carries no answer either, so it reads as a refusal', async () => {
    const watched = answering(() => new Response('', { status: 200 }));

    await expect(readingOfTheJudge(watched.ask)).resolves.toEqual({ heard: 'refusal' });
  });
});

describe('a judge whose answer stopped arriving halfway', () => {
  test('a body severed past the budget reads as a silence rather than a refusal', async () => {
    const watched = answeringWithASeveredBody();

    await expect(readingOfTheJudge({ ...watched.ask, boundMs: 20 })).resolves.toEqual({
      heard: 'timeout',
    });
  });

  test('a body severed past the budget never stands the judge down', async () => {
    const watched = answeringWithASeveredBody();

    await readingOfTheJudge({ ...watched.ask, boundMs: 20 });

    expect(watched.cooled).toEqual([]);
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
