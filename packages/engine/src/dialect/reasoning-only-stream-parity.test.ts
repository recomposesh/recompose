import { describe, expect, it } from 'vitest';

import type { HubStreamEvent } from './hub';

import { encodeStream } from './responses-stream-encode';

describe('a Responses stream that thought and then said nothing', () => {
  it('should not claim the response completed', async () => {
    const seen = await terminalTypes(reasoningOnly());

    expect(seen).toContain('response.incomplete');
    expect(seen).not.toContain('response.completed');
  });

  it('should complete a turn whose reasoning was followed by an answer', async () => {
    const seen = await terminalTypes(reasoningThenText());

    expect(seen).toContain('response.completed');
  });

  it('should leave a turn that never reasoned alone', async () => {
    const seen = await terminalTypes(neitherReasonedNorAnswered());

    expect(seen).toContain('response.completed');
  });
});

async function terminalTypes(events: readonly HubStreamEvent[]): Promise<string[]> {
  const seen: string[] = [];

  for await (const event of encodeStream(asyncOf(events))) {
    if (typeof event.type === 'string') seen.push(event.type);
  }

  return seen;
}

async function* asyncOf(events: readonly HubStreamEvent[]) {
  await Promise.resolve();

  for (const event of events) yield event;
}

function begin(id: string): HubStreamEvent {
  return { type: 'message-begin', id, model: 'deepseek-v4-flash' };
}

function end(): HubStreamEvent {
  return { type: 'message-end', stopReason: 'end', usage: {} };
}

function reasoningOnly(): HubStreamEvent[] {
  return [
    begin('resp_reasoning_only'),
    { type: 'block-open', index: 0, opening: { kind: 'thinking' } },
    { type: 'block-delta', index: 0, delta: { kind: 'thinking', text: 'still thinking' } },
    end(),
  ];
}

function reasoningThenText(): HubStreamEvent[] {
  return [
    begin('resp_answered'),
    { type: 'block-open', index: 0, opening: { kind: 'thinking' } },
    { type: 'block-close', index: 0 },
    { type: 'block-open', index: 1, opening: { kind: 'text' } },
    { type: 'block-delta', index: 1, delta: { kind: 'text', text: 'the answer' } },
    { type: 'block-close', index: 1 },
    end(),
  ];
}

function neitherReasonedNorAnswered(): HubStreamEvent[] {
  return [begin('resp_empty'), end()];
}
