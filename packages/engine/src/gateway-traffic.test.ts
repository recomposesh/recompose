import type { RequestOutcome } from '@recompose/contracts';

import { describe, expect, test } from 'vitest';

import type { NoteTraffic } from './gateway-traffic';

import { grantsNothing } from './gateway-app.testkit';
import { watchingTraffic } from './gateway-traffic';

type Noted = { slug: string; virtualModel: string; request: RequestOutcome };

function noting(): { noted: Noted[]; note: NoteTraffic } {
  const noted: Noted[] = [];

  return {
    noted,
    note: (slug, virtualModel, request) => {
      noted.push({ slug, virtualModel, request });
    },
  };
}

const answeredAt = 1_754_600_000_000;

const atTheSameMoment = () => answeredAt;

function answering(status: number): Response {
  return new Response('{}', { status });
}

function watching(note: NoteTraffic) {
  return watchingTraffic(grantsNothing, note, atTheSameMoment);
}

async function spendingOn(virtualModel: string, answer: Response): Promise<Noted[]> {
  const { noted, note } = noting();

  await watching(note)(async (spendGrantFor) => {
    await spendGrantFor('personal', virtualModel);

    return answer;
  });

  return noted;
}

async function outcomeOf(status: number): Promise<RequestOutcome | undefined> {
  return (await spendingOn('fast', answering(status))).at(0)?.request;
}

describe('what one finished request tells the parent', () => {
  test('a request that answered well is noted as served under the model it asked for', async () => {
    expect(await spendingOn('fast', answering(200))).toEqual([
      { slug: 'personal', virtualModel: 'fast', request: { outcome: 'served', at: answeredAt } },
    ]);
  });

  test('a request the target turned away is noted as failed, carrying the status', async () => {
    expect(await outcomeOf(429)).toEqual({
      outcome: 'failed',
      at: answeredAt,
      status: 429,
      detail: 'The target is turning requests away for now.',
    });
  });

  test('the last answer that still counts as served is the one before the four hundreds', async () => {
    expect((await outcomeOf(399))?.outcome).toBe('served');
    expect((await outcomeOf(400))?.outcome).toBe('failed');
  });
});

describe('the sentence a red cable offers', () => {
  test('a gateway that could not reach the target explains that rather than the status alone', async () => {
    expect(await outcomeOf(502)).toMatchObject({
      detail: 'The gateway could not reach the target.',
    });
  });

  test('a refused credential reads as a credential the target would not take', async () => {
    expect(await outcomeOf(401)).toMatchObject({ detail: 'The target refused the credential.' });
    expect(await outcomeOf(403)).toMatchObject({ detail: 'The target refused the credential.' });
  });

  test('a status no sentence is written for still reads as the answer the target gave', async () => {
    expect(await outcomeOf(503)).toMatchObject({ status: 503, detail: 'The target answered 503.' });
  });

  test('nothing a request or an answer carried rides along with the note', async () => {
    const carrying = new Response(JSON.stringify({ secret: 'sk-live-40d1', prompt: 'my diary' }), {
      status: 500,
    });

    const noted = await spendingOn('fast', carrying);

    expect(JSON.stringify(noted)).not.toContain('sk-live-40d1');
    expect(JSON.stringify(noted)).not.toContain('my diary');
  });
});

describe('what the watch leaves exactly as it found it', () => {
  test('a request no virtual model owned is noted nowhere', async () => {
    const { noted, note } = noting();

    await watching(note)(async () => Promise.resolve(answering(404)));

    expect(noted).toEqual([]);
  });

  test('the grant the serving path receives still answers what the host granted', async () => {
    const { note } = noting();
    const granted: unknown[] = [];

    await watching(note)(async (spendGrantFor) => {
      granted.push(await spendGrantFor('personal', 'fast'));

      return answering(200);
    });

    expect(granted).toEqual([{ verdict: 'missing-target' }]);
  });

  test('the answer the caller asked for reaches the caller unchanged', async () => {
    const { note } = noting();
    const answer = answering(200);

    await expect(watching(note)(async () => Promise.resolve(answer))).resolves.toBe(answer);
  });

  test('two requests in flight at once each report the model they asked for', async () => {
    const { noted, note } = noting();
    const watched = watching(note);

    const slow = watched(async (spendGrantFor) => {
      await spendGrantFor('personal', 'fast');
      await Promise.resolve();
      await Promise.resolve();

      return answering(200);
    });
    const quick = watched(async (spendGrantFor) => {
      await spendGrantFor('personal', 'deep');

      return answering(500);
    });

    await Promise.all([slow, quick]);

    expect(noted.map((one) => one.virtualModel)).toEqual(['deep', 'fast']);
    expect(noted.map((one) => one.request.outcome)).toEqual(['failed', 'served']);
  });
});
