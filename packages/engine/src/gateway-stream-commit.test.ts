import { describe, expect, it } from 'vitest';

import { aHeldStream } from './gateway-app.testkit';
import { upstreamAtTheCommitLatch } from './gateway-stream-commit';

function anEventStream(body: ReadableStream<Uint8Array>, status = 200): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/event-stream' } });
}

function streamOf(text: string): ReadableStream<Uint8Array> {
  return new Response(text).body ?? new ReadableStream<Uint8Array>();
}

function textOf(step: { value?: Uint8Array | undefined }): string {
  return step.value === undefined ? '' : new TextDecoder().decode(step.value);
}

const RATE_LIMITED =
  'event: error\ndata: {"type":"error","error":{"type":"rate_limit_error","message":"slow down"}}\n\n';

const MALFORMED =
  'event: error\ndata: {"type":"error","error":{"type":"invalid_request_error","message":"bad tool schema"}}\n\n';

const FIRST_TEXT = 'data: {"type":"message_start","message":{"id":"msg_1"}}\n\n';

describe('an answer carrying no stream needs no latch at all', () => {
  it('commits a plain JSON answer as it stands', async () => {
    const upstream = new Response('{"ok":true}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const latched = await upstreamAtTheCommitLatch(upstream);

    expect(latched.kind).toBe('committed');
    await expect(latched.upstream.text()).resolves.toBe('{"ok":true}');
  });

  it('commits an event stream that carries no body to read', async () => {
    const latched = await upstreamAtTheCommitLatch(
      new Response(null, { status: 204, headers: { 'content-type': 'text/event-stream' } }),
    );

    expect(latched.kind).toBe('committed');
  });
});

describe('the first upstream event decides whether the child keeps the request', () => {
  it('commits a stream that opens with an ordinary event', async () => {
    const latched = await upstreamAtTheCommitLatch(anEventStream(streamOf(FIRST_TEXT)));

    expect(latched.kind).toBe('committed');
  });

  it('replays the event it held, so the caller loses nothing to the classification', async () => {
    const latched = await upstreamAtTheCommitLatch(
      anEventStream(streamOf(`${FIRST_TEXT}data: {"type":"message_stop"}\n\n`)),
    );

    await expect(latched.upstream.text()).resolves.toBe(
      `${FIRST_TEXT}data: {"type":"message_stop"}\n\n`,
    );
  });

  it('reads a rate limit opening the stream as a failure before commit', async () => {
    const latched = await upstreamAtTheCommitLatch(anEventStream(streamOf(RATE_LIMITED)));

    expect(latched).toMatchObject({ kind: 'error-before-commit', equivalentStatus: 429 });
  });

  it('reads a caller fault opening the stream as a failure before commit too', async () => {
    const latched = await upstreamAtTheCommitLatch(anEventStream(streamOf(MALFORMED)));

    expect(latched).toMatchObject({ kind: 'error-before-commit', equivalentStatus: 400 });
  });

  it("hands the error back, so an answer built from it stays the provider's own word", async () => {
    const latched = await upstreamAtTheCommitLatch(anEventStream(streamOf(MALFORMED)));

    await expect(latched.upstream.text()).resolves.toContain('bad tool schema');
  });

  it('reads a chat-completions error frame, which names no event type of its own', async () => {
    const latched = await upstreamAtTheCommitLatch(
      anEventStream(streamOf('data: {"error":{"type":"rate_limit_error","message":"slow"}}\n\n')),
    );

    expect(latched).toMatchObject({ kind: 'error-before-commit', equivalentStatus: 429 });
  });

  it('commits a stream that ends before it ever names an event', async () => {
    const latched = await upstreamAtTheCommitLatch(anEventStream(streamOf(': keep-alive\n\n')));

    expect(latched.kind).toBe('committed');
  });

  it('reads only the first event, so a later error belongs to the child that already committed', async () => {
    const latched = await upstreamAtTheCommitLatch(
      anEventStream(streamOf(`${FIRST_TEXT}${RATE_LIMITED}`)),
    );

    expect(latched.kind).toBe('committed');
  });
});

function anOpenStream(text: string, whenReleased: () => void): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start: (controller) => {
      controller.enqueue(new TextEncoder().encode(text));
    },
    cancel: whenReleased,
  });
}

describe('a child the walk has decided against lets go of the body it was reading', () => {
  it('releases the upstream body, so a refused child leaves no connection held open', async () => {
    let released = false;

    await upstreamAtTheCommitLatch(
      anEventStream(
        anOpenStream(RATE_LIMITED, () => {
          released = true;
        }),
      ),
    );

    expect(released).toBe(true);
  });

  it('keeps the body of a child that committed, because that stream is still owed downstream', async () => {
    let released = false;

    await upstreamAtTheCommitLatch(
      anEventStream(
        anOpenStream(FIRST_TEXT, () => {
          released = true;
        }),
      ),
    );

    expect(released).toBe(false);
  });

  it('still answers the refusal when the release fails, since that failure is the one already read', async () => {
    const latched = await upstreamAtTheCommitLatch(
      anEventStream(
        anOpenStream(RATE_LIMITED, () => {
          throw new Error('the connection was already gone');
        }),
      ),
    );

    expect(latched).toMatchObject({ kind: 'error-before-commit', equivalentStatus: 429 });
  });
});

describe('holding relay until the first upstream event classifies is not buffering', () => {
  it('settles on the first event while the provider is still writing the rest', async () => {
    const held = aHeldStream();

    held.send(FIRST_TEXT);

    const latched = await upstreamAtTheCommitLatch(anEventStream(held.stream));

    expect(latched.kind).toBe('committed');
  });

  it('relays what arrives after the latch rather than waiting for the stream to end', async () => {
    const held = aHeldStream();

    held.send(FIRST_TEXT);

    const latched = await upstreamAtTheCommitLatch(anEventStream(held.stream));
    const reader = (latched.upstream.body ?? streamOf('')).getReader();
    const first = await reader.read();

    held.send('data: {"type":"message_stop"}\n\n');

    const second = await reader.read();

    held.end();

    expect(textOf(first)).toBe(FIRST_TEXT);
    expect(textOf(second)).toBe('data: {"type":"message_stop"}\n\n');
  });
});
