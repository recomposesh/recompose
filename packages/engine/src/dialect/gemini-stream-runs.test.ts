import { describe, expect, test } from 'vitest';

import type { GeminiPart, GeminiResponse } from './gemini-wire';

import { decodeStream } from './gemini-stream';

describe('Gemini stream text runs', () => {
  test('keeps consecutive text chunks inside one content block', async () => {
    const events = await decoded(chunksOf([{ text: 'hel' }], [{ text: 'lo' }]));

    expect(events).toEqual([
      { type: 'message-begin', usage: {} },
      { type: 'block-open', index: 0, opening: { kind: 'text' } },
      { type: 'block-delta', index: 0, delta: { kind: 'text', text: 'hel' } },
      { type: 'block-delta', index: 0, delta: { kind: 'text', text: 'lo' } },
      { type: 'block-close', index: 0 },
      { type: 'message-end', stopReason: 'end', nativeStopReason: 'stop', usage: {} },
    ]);
  });

  test('keeps consecutive text parts of one chunk inside one content block', async () => {
    const events = await decoded(chunksOf([{ text: 'hel' }, { text: 'lo' }]));
    const openings = events.filter((event) => event.type === 'block-open');

    expect(openings).toEqual([{ type: 'block-open', index: 0, opening: { kind: 'text' } }]);
  });

  test('opens a new block when the run changes from thinking to text', async () => {
    const events = await decoded(chunksOf([{ text: 'why', thought: true }], [{ text: 'so' }]));

    expect(events).toEqual([
      { type: 'message-begin', usage: {} },
      { type: 'block-open', index: 0, opening: { kind: 'thinking' } },
      { type: 'block-delta', index: 0, delta: { kind: 'thinking', text: 'why' } },
      { type: 'block-close', index: 0 },
      { type: 'block-open', index: 1, opening: { kind: 'text' } },
      { type: 'block-delta', index: 1, delta: { kind: 'text', text: 'so' } },
      { type: 'block-close', index: 1 },
      { type: 'message-end', stopReason: 'end', nativeStopReason: 'stop', usage: {} },
    ]);
  });
});

describe('Gemini stream tool runs', () => {
  test('opens a block per named function call', async () => {
    const events = await decoded(
      chunksOf([
        { functionCall: { id: 'a', name: 'run', args: { step: 1 } } },
        { functionCall: { id: 'b', name: 'run', args: { step: 2 } } },
      ]),
    );
    const openings = events.filter((event) => event.type === 'block-open');

    expect(openings).toEqual([
      { type: 'block-open', index: 0, opening: { kind: 'tool', id: 'a', name: 'run' } },
      { type: 'block-open', index: 1, opening: { kind: 'tool', id: 'b', name: 'run' } },
    ]);
  });

  test('folds an unnamed function-call continuation into the open tool block', async () => {
    const events = await decoded(
      chunksOf(
        [{ functionCall: { id: 'a', name: 'run', args: { step: 1 } } }],
        [{ functionCall: { name: '', args: { step: 2 } } }],
      ),
    );

    expect(events.filter((event) => event.type !== 'message-begin')).toEqual([
      { type: 'block-open', index: 0, opening: { kind: 'tool', id: 'a', name: 'run' } },
      { type: 'block-delta', index: 0, delta: { kind: 'json-args', partialJson: '{"step":1}' } },
      { type: 'block-delta', index: 0, delta: { kind: 'json-args', partialJson: '{"step":2}' } },
      { type: 'block-close', index: 0 },
      { type: 'message-end', stopReason: 'tool_use', nativeStopReason: 'stop', usage: {} },
    ]);
  });
});

describe('Gemini stream run boundaries', () => {
  test('keeps consecutive thinking chunks inside one content block', async () => {
    const events = await decoded(
      chunksOf([{ text: 'we', thought: true }], [{ text: 'igh', thought: true }]),
    );
    const openings = events.filter((event) => event.type === 'block-open');

    expect(openings).toEqual([{ type: 'block-open', index: 0, opening: { kind: 'thinking' } }]);
  });

  test('opens a new block when the run changes from text to thinking', async () => {
    const events = await decoded(chunksOf([{ text: 'so' }], [{ text: 'why', thought: true }]));
    const openings = events.filter((event) => event.type === 'block-open');

    expect(openings).toEqual([
      { type: 'block-open', index: 0, opening: { kind: 'text' } },
      { type: 'block-open', index: 1, opening: { kind: 'thinking' } },
    ]);
  });

  test('leaves the open run alone for a part that carries no block', async () => {
    const events = await decoded(
      chunksOf([{ text: 'we', thought: true }], [{}], [{ text: 'igh', thought: true }]),
    );
    const openings = events.filter((event) => event.type === 'block-open');

    expect(openings).toEqual([{ type: 'block-open', index: 0, opening: { kind: 'thinking' } }]);
  });

  test('refuses to fold a web-search part into the open text run', async () => {
    const events = await decoded(
      chunksOf(
        [{ text: 'so' }],
        [{ text: 'searching', serverWebSearch: { kind: 'use', id: 'ws-1', input: {} } }],
      ),
    );
    const openings = events.filter((event) => event.type === 'block-open');

    expect(openings).toEqual([
      { type: 'block-open', index: 0, opening: { kind: 'text' } },
      {
        type: 'block-open',
        index: 1,
        opening: {
          kind: 'tool',
          id: 'ws-1',
          name: 'web_search',
          signature: 'server:web-search',
          serverInput: {},
        },
      },
    ]);
  });
});

describe('Gemini stream run sealing', () => {
  test('seals the run a signed part opened', async () => {
    const events = await decoded(
      chunksOf([{ text: 'so', thoughtSignature: 'EqQBCqEB' }], [{ text: 'more' }]),
    );
    const openings = events.filter((event) => event.type === 'block-open');

    expect(openings).toEqual([
      { type: 'block-open', index: 0, opening: { kind: 'text' } },
      { type: 'block-open', index: 1, opening: { kind: 'text' } },
    ]);
  });

  test('leaves the run open across a part whose signature is empty', async () => {
    const events = await decoded(
      chunksOf([{ text: 'so', thoughtSignature: '' }], [{ text: 'me' }]),
    );
    const openings = events.filter((event) => event.type === 'block-open');

    expect(openings).toEqual([{ type: 'block-open', index: 0, opening: { kind: 'text' } }]);
  });

  test('breaks the run for a part that carries a signature direction', async () => {
    const events = await decoded(
      chunksOf([{ text: 'so' }], [{ text: 'me', responsesSignatureDirection: 'previous' }]),
    );
    const openings = events.filter((event) => event.type === 'block-open');

    expect(openings).toEqual([
      { type: 'block-open', index: 0, opening: { kind: 'text' } },
      { type: 'block-open', index: 1, opening: { kind: 'text', signatureDirection: 'previous' } },
    ]);
  });
});

// Helpers

async function decoded(source: AsyncIterable<GeminiResponse>) {
  const events = [];

  for await (const event of decodeStream(source)) events.push(event);

  return events;
}

function chunksOf(...chunks: readonly (readonly GeminiPart[])[]): AsyncIterable<GeminiResponse> {
  return (async function* stream() {
    await Promise.resolve();

    for (const [index, parts] of chunks.entries()) {
      const last = index === chunks.length - 1;

      yield {
        candidates: [
          {
            content: { role: 'model', parts: [...parts] },
            ...(last ? { finishReason: 'STOP' } : {}),
          },
        ],
      };
    }
  })();
}
