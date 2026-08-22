import { describe, expect, it } from 'vitest';

import type { HubStreamEvent } from './hub';

import { decodeStream, encodeStream } from './responses-codec';
import { collect, streamOf } from './responses.testkit';

async function encode(events: readonly HubStreamEvent[]) {
  return collect(encodeStream(streamOf(events)));
}

describe('encodeStream: a stream error ends on a terminal response.failed', () => {
  it('ends a stream error as a failed response carrying the error detail', async () => {
    const events = await encode([
      { type: 'stream-error', error: { type: 'overloaded_error', message: 'slow down' } },
    ]);

    expect(events).toStrictEqual([
      {
        type: 'response.failed',
        response: {
          id: 'resp_translated',
          status: 'failed',
          output: [],
          error: { type: 'overloaded_error', message: 'slow down' },
        },
      },
    ]);
  });

  it('carries the response identity the stream opened with', async () => {
    const events = await encode([
      { type: 'message-begin', id: 'resp_live', model: 'gpt-5.4' },
      { type: 'stream-error', error: { type: 'usage_limit_reached', message: 'limit reached' } },
    ]);

    expect(events.at(-1)).toEqual({
      type: 'response.failed',
      response: {
        id: 'resp_live',
        model: 'gpt-5.4',
        status: 'failed',
        output: [],
        error: { type: 'usage_limit_reached', message: 'limit reached' },
      },
    });
  });
});

describe('encodeStream: the failed response holds what the stream produced', () => {
  it('carries the output the stream finished before it died', async () => {
    const events = await encode([
      { type: 'block-open', index: 0, opening: { kind: 'text' } },
      { type: 'block-delta', index: 0, delta: { kind: 'text', text: 'half an answer' } },
      { type: 'block-close', index: 0 },
      { type: 'stream-error', error: { type: 'overloaded_error', message: 'slow down' } },
    ]);

    expect(events.at(-1)).toEqual({
      type: 'response.failed',
      response: {
        id: 'resp_translated',
        status: 'failed',
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [
              { type: 'output_text', text: 'half an answer', annotations: [], logprobs: [] },
            ],
          },
        ],
        error: { type: 'overloaded_error', message: 'slow down' },
      },
    });
  });

  it('stops after the failed response and encodes no later hub event', async () => {
    const events = await encode([
      { type: 'stream-error', error: { type: 'overloaded_error', message: 'slow down' } },
      { type: 'block-open', index: 0, opening: { kind: 'text' } },
    ]);

    expect(events).toHaveLength(1);
  });
});

describe('decodeStream: a translated failure crosses back as the same stream error', () => {
  it('reads the emitted failure back into its hub stream error', async () => {
    const failure: HubStreamEvent = {
      type: 'stream-error',
      error: { type: 'overloaded_error', message: 'slow down' },
    };
    const encoded = await encode([failure]);

    expect(await collect(decodeStream(streamOf(encoded)))).toEqual([failure]);
  });
});
