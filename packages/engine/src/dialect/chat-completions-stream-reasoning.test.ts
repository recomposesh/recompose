import { describe, expect, it } from 'vitest';

import type { ChatStreamFrame } from './chat-completions-wire';
import type { HubStreamEvent } from './hub';

import { decodeStream } from './chat-completions-stream';
import { collect, streamOf } from './chat-completions.testkit';

function chunkOf(delta: Record<string, unknown>): ChatStreamFrame {
  return { type: 'chunk', chunk: { id: 'chatcmpl-1', choices: [{ index: 0, delta }] } };
}

const closing: ChatStreamFrame = {
  type: 'chunk',
  chunk: { id: 'chatcmpl-1', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
};

function blocksOf(events: readonly HubStreamEvent[]) {
  return events
    .filter((event) => event.type === 'block-open' || event.type === 'block-delta')
    .map((event) =>
      event.type === 'block-open'
        ? { open: event.opening.kind, index: event.index }
        : { delta: event.delta, index: event.index },
    );
}

describe('what a streaming chat-completions answer says it was thinking', () => {
  it('opens a thinking block ahead of the text the thought produced', async () => {
    const events = await collect(
      decodeStream(
        streamOf([
          chunkOf({ reasoning_content: 'weighed ' }),
          chunkOf({ reasoning_content: 'both' }),
          chunkOf({ content: 'done' }),
          closing,
        ]),
      ),
    );

    expect(blocksOf(events)).toEqual([
      { open: 'thinking', index: 0 },
      { delta: { kind: 'thinking', text: 'weighed ' }, index: 0 },
      { delta: { kind: 'thinking', text: 'both' }, index: 0 },
      { open: 'text', index: 1 },
      { delta: { kind: 'text', text: 'done' }, index: 1 },
    ]);
  });

  it('reads a vendor spelling the field `reasoning` the same way', async () => {
    const events = await collect(
      decodeStream(streamOf([chunkOf({ reasoning: 'weighed both' }), closing])),
    );

    expect(blocksOf(events)).toEqual([
      { open: 'thinking', index: 0 },
      { delta: { kind: 'thinking', text: 'weighed both' }, index: 0 },
    ]);
  });

  it('a stream that thought about nothing opens no thinking block', async () => {
    const events = await collect(
      decodeStream(
        streamOf([chunkOf({ reasoning_content: '' }), chunkOf({ content: 'done' }), closing]),
      ),
    );

    expect(blocksOf(events)).toEqual([
      { open: 'text', index: 0 },
      { delta: { kind: 'text', text: 'done' }, index: 0 },
    ]);
  });
});
