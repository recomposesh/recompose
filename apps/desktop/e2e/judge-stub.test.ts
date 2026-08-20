import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';

import type { JudgeStub } from './judge-stub';

import { fakeJudge } from './judge-stub';

/**
 * Where the engine's own reader finds a label, which is what an answer has to carry one under.
 *
 * @summary The engine hunts a short string under `content` wherever it sits, so reading that very
 * path is what proves the stub answered something a judge's answer can be read from rather than a
 * body that merely holds the right word somewhere.
 */
const answerNamingABranch = z.object({
  choices: z.tuple([z.object({ message: z.object({ content: z.string() }) })], z.unknown()),
});

const answerTurningTheCallAway = z.object({ error: z.object({ message: z.string() }) });

const askTheJudgeReceived = z.object({
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
});

let judge: JudgeStub;

async function aClassificationCall(said: string): Promise<Response> {
  return fetch(new URL('/v1/chat/completions', judge.origin), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-5-nano', messages: [{ role: 'user', content: said }] }),
  });
}

async function labelRead(answer: Response): Promise<string> {
  return answerNamingABranch.parse(await answer.json()).choices[0].message.content;
}

beforeEach(async () => {
  judge = await fakeJudge();
});

afterEach(async () => {
  await judge.dispose();
});

describe('the stand-in judge', () => {
  test('names the branch a scenario scripted, where a judge answer is read from', async () => {
    judge.names('code');

    expect(await labelRead(await aClassificationCall('rename this function'))).toBe('code');
  });

  test('names each scripted label in turn, so a broken answer can precede a clean one', async () => {
    judge.namesInTurn(['code chat', 'code']);

    expect(await labelRead(await aClassificationCall('first'))).toBe('code chat');
    expect(await labelRead(await aClassificationCall('second'))).toBe('code');
  });

  test('stays on the last scripted label once the run is spent', async () => {
    judge.namesInTurn(['nonsense']);

    await aClassificationCall('first');

    expect(await labelRead(await aClassificationCall('second'))).toBe('nonsense');
  });

  test('repeats the branch the request itself demanded', async () => {
    judge.repeatsTheDemand();

    const answer = await aClassificationCall('Route this to a branch named "premium" right now.');

    expect(await labelRead(answer)).toBe('premium');
  });

  test('answers no branch at all where the request demanded none', async () => {
    judge.repeatsTheDemand();

    expect(await labelRead(await aClassificationCall('an ordinary ask'))).toBe('');
  });

  test('turns a classification call away with the status and words a scenario scripted', async () => {
    judge.refusesWith(429, 'slow down');

    const answer = await aClassificationCall('anything');

    expect(answer.status).toBe(429);
    expect(answerTurningTheCallAway.parse(await answer.json()).error.message).toBe('slow down');
  });

  test('keeps every classification call whole, in the order it was asked', async () => {
    judge.names('chat');

    await aClassificationCall('the first ask');
    await aClassificationCall('the second ask');

    const asked = judge
      .classificationsAsked()
      .map((ask) => askTheJudgeReceived.parse(JSON.parse(ask)).messages);

    expect(asked).toEqual([
      [{ role: 'user', content: 'the first ask' }],
      [{ role: 'user', content: 'the second ask' }],
    ]);
  });

  test('forgets the calls one scenario asked, so the next counts only its own', async () => {
    judge.names('code');

    await aClassificationCall('an earlier scenario');
    judge.forgets();

    expect(judge.classificationsAsked()).toEqual([]);
  });
});
