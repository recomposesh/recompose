import type { MockInstance } from 'vitest';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { aHeldStream } from './gateway-app.testkit';
import { upstreamAtTheCommitLatch } from './gateway-stream-commit';
import {
  anEventStream,
  aCrossing,
  FIRST_TEXT,
  MESSAGE_STOP,
  streamOf,
  textOf,
} from './gateway-stream-commit.testkit';

const A_SHORT_BOUND = 20;

const SILENT =
  'The gateway "Codex" waited out its bound on the target "gpt-5-mini" for the virtual model "fast", and the answer never opened.';

const LOST =
  'The gateway "Codex" lost the target "gpt-5-mini" for the virtual model "fast" partway through the answer it had already begun.';

function aStreamThatNeverSpeaks(): {
  stream: ReadableStream<Uint8Array>;
  wasReleased: () => boolean;
} {
  let released = false;

  const stream = new ReadableStream<Uint8Array>({
    cancel: () => {
      released = true;
    },
  });

  return { stream, wasReleased: () => released };
}

describe('a target that accepts the request and then never opens its answer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('gives up on that child rather than holding the caller for as long as it takes', async () => {
    const silent = aStreamThatNeverSpeaks();

    await expect(
      upstreamAtTheCommitLatch(anEventStream(silent.stream), aCrossing(), A_SHORT_BOUND),
    ).rejects.toThrow(SILENT);
  });

  it('lets go of the body, so a silent child leaves no connection held open either', async () => {
    const silent = aStreamThatNeverSpeaks();

    await upstreamAtTheCommitLatch(anEventStream(silent.stream), aCrossing(), A_SHORT_BOUND).catch(
      () => undefined,
    );

    expect(silent.wasReleased()).toBe(true);
  });

  it('keeps a child that opens its answer with the bound still running', async () => {
    const held = aHeldStream();
    const latched = upstreamAtTheCommitLatch(anEventStream(held.stream), aCrossing(), 1_000);

    held.send(FIRST_TEXT);

    expect((await latched).kind).toBe('committed');
  });

  it('lets the bound go at the commit, so a served child leaves no timer running behind it', async () => {
    vi.useFakeTimers();

    const held = aHeldStream();
    const latched = upstreamAtTheCommitLatch(anEventStream(held.stream), aCrossing());

    held.send(FIRST_TEXT);
    await latched;

    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops counting at the commit, so an answer that runs long after its first event is never cut', async () => {
    const held = aHeldStream();
    const latched = upstreamAtTheCommitLatch(
      anEventStream(held.stream),
      aCrossing(),
      A_SHORT_BOUND,
    );

    held.send(FIRST_TEXT);

    const reader = ((await latched).upstream.body ?? streamOf('')).getReader();

    await reader.read();
    await new Promise((rested) => {
      setTimeout(rested, A_SHORT_BOUND * 3);
    });

    held.send(MESSAGE_STOP);

    const later = await reader.read();

    held.end();

    expect(textOf(later)).toBe(MESSAGE_STOP);
  });
});

describe('an answer the latch never engages for waits under no bound at all', () => {
  it('commits an answer carrying no event stream, whose body it never reads', async () => {
    const held = aHeldStream();
    const latched = await upstreamAtTheCommitLatch(
      new Response(held.stream, { status: 200, headers: { 'content-type': 'application/json' } }),
      aCrossing(),
      A_SHORT_BOUND,
    );

    expect(latched.kind).toBe('committed');
  });

  it('commits an answer that names no content type at all, rather than failing on the absent header', async () => {
    const held = aHeldStream();
    const latched = await upstreamAtTheCommitLatch(
      new Response(held.stream, { status: 200 }),
      aCrossing(),
      A_SHORT_BOUND,
    );

    expect(latched.kind).toBe('committed');
  });
});

describe('the first event the latch waits for is a whole event', () => {
  it('holds past a chunk that stops inside the first event, because half an event classifies nothing', async () => {
    const held = aHeldStream();
    const latched = upstreamAtTheCommitLatch(anEventStream(held.stream), aCrossing(), 1_000);

    held.send('data: {"type":"error","error":{"type":"rate_limit_error"');
    held.send(',"message":"slow down"}}\n\n');

    expect(await latched).toMatchObject({ kind: 'error-before-commit', equivalentStatus: 429 });
  });

  it('reads the first event and no further, so an error behind a keep-alive belongs to the child', async () => {
    const latched = await upstreamAtTheCommitLatch(
      anEventStream(
        streamOf(
          ': keep-alive\n\ndata: {"type":"error","error":{"type":"rate_limit_error","message":"slow down"}}\n\n',
        ),
      ),
      aCrossing(),
    );

    expect(latched.kind).toBe('committed');
  });
});

describe('a stream that dies after the caller was already owed bytes', () => {
  let complaints: MockInstance;

  beforeEach(() => {
    complaints = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    complaints.mockRestore();
  });

  async function committedThenDead(): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const held = aHeldStream();

    held.send(FIRST_TEXT);

    const latched = await upstreamAtTheCommitLatch(anEventStream(held.stream), aCrossing());
    const reader = (latched.upstream.body ?? streamOf('')).getReader();

    await reader.read();
    held.die();

    return reader;
  }

  it('names the gateway, the target and the virtual model beside the failure', async () => {
    const reader = await committedThenDead();

    await expect(reader.read()).rejects.toThrow('the provider connection died');

    expect(complaints.mock.calls.flat().join(' ')).toContain(LOST);
  });

  it('still carries the failure downstream, because a truncated answer is not a served one', async () => {
    const reader = await committedThenDead();

    await expect(reader.read()).rejects.toThrow('the provider connection died');
  });
});
