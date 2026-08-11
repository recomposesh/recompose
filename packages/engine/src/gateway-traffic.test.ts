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

function failingWith(body: unknown, status = 402): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function watching(note: NoteTraffic) {
  return watchingTraffic(grantsNothing, note, atTheSameMoment);
}

async function spendingOn(virtualModel: string, answer: Response): Promise<Noted[]> {
  const { noted, note } = noting();

  const answered = await watching(note)(async (spendGrantFor) => {
    await spendGrantFor('personal', virtualModel);

    return answer;
  });

  await answered.arrayBuffer();

  return noted;
}

async function settlingOn(
  virtualModel: string,
  answer: Response,
): Promise<RequestOutcome | undefined> {
  return (await spendingOn(virtualModel, answer)).at(-1)?.request;
}

async function settledOutcomeOf(status: number): Promise<RequestOutcome | undefined> {
  return settlingOn('fast', answering(status));
}

describe('what one finished request tells the parent', () => {
  test('a request that answered well is noted live and then served under the model it asked for', async () => {
    expect(await spendingOn('fast', answering(200))).toEqual([
      { slug: 'personal', virtualModel: 'fast', request: { outcome: 'live', at: answeredAt } },
      { slug: 'personal', virtualModel: 'fast', request: { outcome: 'served', at: answeredAt } },
    ]);
  });

  test('a request the target turned away settles as failed, carrying the status', async () => {
    expect(await settledOutcomeOf(429)).toEqual({
      outcome: 'failed',
      at: answeredAt,
      status: 429,
      detail: 'The target is turning requests away for now.',
    });
  });

  test('the last answer that still counts as served is the one before the four hundreds', async () => {
    expect((await settledOutcomeOf(399))?.outcome).toBe('served');
    expect((await settledOutcomeOf(400))?.outcome).toBe('failed');
  });
});

describe('the sentence a red cable offers', () => {
  test('a gateway that could not reach the target explains that rather than the status alone', async () => {
    expect(await settledOutcomeOf(502)).toMatchObject({
      detail: 'The gateway could not reach the target.',
    });
  });

  test('a refused credential reads as a credential the target would not take', async () => {
    expect(await settledOutcomeOf(401)).toMatchObject({
      detail: 'The target refused the credential.',
    });
    expect(await settledOutcomeOf(403)).toMatchObject({
      detail: 'The target refused the credential.',
    });
  });

  test('a status no sentence is written for still reads as the answer the target gave', async () => {
    expect(await settledOutcomeOf(503)).toMatchObject({
      status: 503,
      detail: 'The target answered 503.',
    });
  });
});

describe('the words the target itself offered', () => {
  test('a target that explained itself is quoted on the cable', async () => {
    const answer = failingWith({
      error: { message: 'This request requires more credits, or fewer max_tokens.' },
    });

    expect(await settlingOn('fast', answer)).toMatchObject({
      status: 402,
      detail: 'This request requires more credits, or fewer max_tokens.',
    });
  });

  test('an explanation the target wrote as a bare string still reads', async () => {
    const settled = await settlingOn('fast', failingWith({ error: 'quota exhausted' }));

    expect(settled).toMatchObject({ detail: 'quota exhausted' });
  });

  test('a wordless error body falls back to the written sentence', async () => {
    const settled = await settlingOn('fast', failingWith({ error: { code: 'over_limit' } }));

    expect(settled).toMatchObject({ detail: 'The target answered 402.' });
  });

  test('a message of nothing but whitespace is no quote, so the sentence stands', async () => {
    const settled = await settlingOn('fast', failingWith({ error: { message: ' \n\t ' } }));

    expect(settled).toMatchObject({ detail: 'The target answered 402.' });
  });
});

function answerHoldingItsBody(): { holding: Response; release: () => void } {
  let holdingTheBody: ReadableStreamDefaultController<Uint8Array> | undefined;
  const holding = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"error":{"message":"slow'));
        holdingTheBody = controller;
      },
    }),
    { status: 429, headers: { 'content-type': 'application/json' } },
  );

  return {
    holding,
    release: () => {
      holdingTheBody?.close();
    },
  };
}

describe('what a failed answer may never do to the request that carried it', () => {
  test('an answer whose body outlives the quote deadline still comes back, noted from the status alone', async () => {
    const { holding, release } = answerHoldingItsBody();
    const { noted, note } = noting();

    const answered = await watching(note)(async (spendGrantFor) => {
      await spendGrantFor('personal', 'fast');

      return holding;
    });

    expect(answered.status).toBe(429);

    release();
    await answered.arrayBuffer();

    expect(noted.at(-1)?.request).toMatchObject({
      detail: 'The target is turning requests away for now.',
    });
  });

  test('an explanation longer than a card holds is cut to its span', async () => {
    const settled = await settlingOn('fast', failingWith({ error: { message: 'w'.repeat(500) } }));

    expect(settled).toMatchObject({ detail: 'w'.repeat(280) });
  });

  test('the answer still carries its whole body to the caller after the note', async () => {
    const answer = failingWith({ error: { message: 'no credits' } });
    const { noted, note } = noting();

    const out = await watching(note)(async (spendGrantFor) => {
      await spendGrantFor('personal', 'fast');

      return answer;
    });

    expect(await out.json()).toEqual({ error: { message: 'no credits' } });
    expect(noted.map((one) => one.request.outcome)).toEqual(['live', 'failed']);
  });

  test('a served answer is never read for a quote', async () => {
    const answer = failingWith({ error: { message: 'ignore me' } }, 200);

    expect(await settlingOn('fast', answer)).toEqual({
      outcome: 'served',
      at: answeredAt,
    });
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

    const [slowAnswer, quickAnswer] = await Promise.all([slow, quick]);

    await Promise.all([slowAnswer.arrayBuffer(), quickAnswer.arrayBuffer()]);

    const outcomesFor = (virtualModel: string) =>
      noted.filter((one) => one.virtualModel === virtualModel).map((one) => one.request.outcome);

    expect(outcomesFor('fast')).toEqual(['live', 'served']);
    expect(outcomesFor('deep')).toEqual(['live', 'failed']);
  });
});
