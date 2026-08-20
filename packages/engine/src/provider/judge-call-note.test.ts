import { describe, expect, test } from 'vitest';

import { readingOfTheJudge } from './judge-call';
import { answering, neverAnswering, tickingBy } from './judge-call.testkit';

describe('the row a person watches judging happen through', () => {
  test('a judge that answered leaves a row naming its model, its status and its wait', async () => {
    const watched = answering(() => Response.json({ choices: [{ message: { content: 'code' } }] }));

    await readingOfTheJudge({ ...watched.ask, now: tickingBy(40) });

    expect(watched.noted).toEqual([
      {
        provider: 'openai',
        providerModel: 'gpt-5-mini',
        status: 200,
        durationMs: 40,
      },
    ]);
  });

  test('the row carries neither the words the caller wrote nor the branch the judge named', async () => {
    const watched = answering(() => Response.json({ choices: [{ message: { content: 'code' } }] }));

    await readingOfTheJudge(watched.ask);

    expect(JSON.stringify(watched.noted)).not.toContain('rename this function');
    expect(JSON.stringify(watched.noted)).not.toContain('code');
  });

  test('a judge that refused leaves the refusal’s own status on the row', async () => {
    const watched = answering(() => new Response('{}', { status: 429 }));

    await readingOfTheJudge(watched.ask);

    expect(watched.noted.at(0)).toMatchObject({ status: 429 });
  });

  test('a judge that ran past its budget leaves a row saying so rather than none at all', async () => {
    const watched = neverAnswering();

    await readingOfTheJudge({ ...watched.ask, boundMs: 20 });

    expect(watched.noted.at(0)).toMatchObject({
      status: 504,
      failure: 'The judge did not answer inside its budget.',
    });
  });

  test('a judge nothing could reach leaves a row saying that instead', async () => {
    const watched = answering(() => {
      throw new Error('the judge connection died');
    });

    await readingOfTheJudge(watched.ask);

    expect(watched.noted.at(0)).toMatchObject({
      status: 502,
      failure: 'The judge could not be reached.',
    });
  });

  test('a binding nothing resolved leaves no row, because no call was ever made', async () => {
    const watched = answering(() => Response.json({}), { verdict: 'missing-target' });

    await readingOfTheJudge(watched.ask);

    expect(watched.noted).toEqual([]);
  });
});
