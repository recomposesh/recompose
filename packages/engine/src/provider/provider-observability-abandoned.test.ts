import { describe, expect, test } from 'vitest';

import type { ProviderAttempt } from './telemetry-feed';

import { ProviderObservability } from './provider-observability';
import { withinServingTurn } from './serving-turn';
import { subscribeToProviderAttempts } from './telemetry-feed';

function aTurn() {
  return { gateway: 'my-gateway', clientKey: 'client-1', method: 'POST', rowPublished: false };
}

function streamingAnswer(closes: boolean): Response {
  const body = new ReadableStream<Uint8Array>({
    start: (controller) => {
      controller.enqueue(new TextEncoder().encode('data: {}\n\n'));

      if (closes) controller.close();
    },
  });

  return new Response(body, { status: 200 });
}

async function rowsWhile(work: () => Promise<void>): Promise<ProviderAttempt[]> {
  const rows: ProviderAttempt[] = [];
  const forget = subscribeToProviderAttempts((row) => {
    rows.push(row);
  });

  try {
    await work();
  } finally {
    forget();
  }

  return rows;
}

async function watchedAnswer(closes = false): Promise<Response> {
  const observability = new ProviderObservability();

  return withinServingTurn(aTurn(), async () =>
    Promise.resolve(
      observability
        .start({
          provider: 'anthropic',
          model: 'claude-opus-5',
          dialect: 'anthropic',
          method: 'POST',
        })
        .observe(streamingAnswer(closes)),
    ),
  );
}

describe('an answer the gateway went past', () => {
  test('a body nobody drains still settles the attempt it opened', async () => {
    const rows = await rowsWhile(async () => {
      const answer = await watchedAnswer();

      await answer.body?.cancel();
    });

    expect(rows.at(-1)?.durationMs).toBeTypeOf('number');
  });

  test('a body read to the end settles the attempt the same way', async () => {
    const rows = await rowsWhile(async () => {
      const answer = await watchedAnswer(true);

      await answer.text();
    });

    expect(rows.at(-1)?.durationMs).toBeTypeOf('number');
  });

  test('the attempt opens in flight before either ending settles it', async () => {
    const rows = await rowsWhile(async () => {
      await watchedAnswer();
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.durationMs).toBeUndefined();
  });
});
