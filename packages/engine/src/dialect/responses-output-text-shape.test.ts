import { describe, expect, it } from 'vitest';

import type { HubStreamEvent } from './hub';
import type { ResponsesStreamEvent } from './responses-wire';

import { encodeStream } from './responses-stream-encode';

const answered: readonly HubStreamEvent[] = [
  { type: 'message-begin', id: 'resp_1', model: 'gemini-3-pro-preview' },
  { type: 'block-open', index: 0, opening: { kind: 'text' } },
  { type: 'block-delta', index: 0, delta: { kind: 'text', text: 'answered' } },
  { type: 'block-close', index: 0 },
  { type: 'message-end', stopReason: 'end', usage: { inputTokens: 1, outputTokens: 1 } },
];

async function* hubStream(events: readonly HubStreamEvent[]): AsyncIterable<HubStreamEvent> {
  for (const event of events) {
    await Promise.resolve();

    yield event;
  }
}

type CompletedItem = {
  type: 'response.output_item.done';
  item?: { type?: string; content?: readonly unknown[] };
};

function completedMessage(event: ResponsesStreamEvent): event is CompletedItem {
  return event.type === 'response.output_item.done';
}

function messageContent(event: ResponsesStreamEvent): readonly unknown[] {
  if (!completedMessage(event)) return [];

  return event.item?.type === 'message' ? (event.item.content ?? []) : [];
}

async function completedContent(): Promise<unknown[]> {
  const parts: unknown[] = [];

  for await (const event of encodeStream(hubStream(answered))) {
    parts.push(...messageContent(event));
  }

  return parts;
}

describe('the completed message a Responses client reads', () => {
  it('names annotations and logprobs on every text part, even holding none', async () => {
    expect(await completedContent()).toEqual([
      { type: 'output_text', text: 'answered', annotations: [], logprobs: [] },
    ]);
  });
});
