import { describe, expect, it } from 'vitest';

import type { ChatStreamFrame, ChatToolCallDelta } from './chat-completions-wire';
import type { HubStreamEvent } from './hub';

import { decodeStream, decodeStreamForResponses } from './chat-completions-stream-decode';

async function* chatStream(frames: readonly ChatStreamFrame[]): AsyncIterable<ChatStreamFrame> {
  for (const frame of frames) {
    await Promise.resolve();

    yield frame;
  }
}

function toolOpenings(events: readonly HubStreamEvent[]) {
  return events.flatMap((event) =>
    event.type === 'block-open' && event.opening.kind === 'tool' ? [event.opening] : [],
  );
}

function argumentDeltas(events: readonly HubStreamEvent[]): string[] {
  return events.flatMap((event) =>
    event.type === 'block-delta' && event.delta.kind === 'json-args'
      ? [event.delta.partialJson]
      : [],
  );
}

async function collected(source: AsyncIterable<HubStreamEvent>): Promise<HubStreamEvent[]> {
  const events: HubStreamEvent[] = [];

  for await (const event of source) {
    events.push(event);
  }

  return events;
}

function toolChunk(choice: number, calls: readonly ChatToolCallDelta[]): ChatStreamFrame {
  return { type: 'chunk', chunk: { choices: [{ index: choice, delta: { tool_calls: calls } }] } };
}

function toolFinish(choice: number): ChatStreamFrame {
  return {
    type: 'chunk',
    chunk: { choices: [{ index: choice, delta: {}, finish_reason: 'tool_calls' }] },
  };
}

function finishedCallStream(
  choice: number,
  calls: readonly ChatToolCallDelta[],
): AsyncIterable<ChatStreamFrame> {
  return chatStream([toolChunk(choice, calls), toolFinish(choice), { type: 'done' }]);
}

const anonymousCall: ChatToolCallDelta = {
  index: 0,
  id: 'call_a',
  function: { arguments: '{"city":"Paris"}' },
};

describe('naming a Responses tool call the chat stream left anonymous', () => {
  it('should fall back to a generic response id when the chunk names none', async () => {
    const events = await collected(
      decodeStreamForResponses(
        chatStream([
          {
            type: 'chunk',
            chunk: {
              choices: [
                {
                  index: 0,
                  delta: { tool_calls: [{ index: 0, function: { name: 'Bash' } }] },
                  finish_reason: 'tool_calls',
                },
              ],
            },
          },
          { type: 'done' },
        ]),
      ),
    );

    expect(toolOpenings(events).map((opening) => opening.id)).toEqual(['call_chatcmpl_0_0']);
  });

  it('should count the choice the call arrived on into that generic id', async () => {
    const events = await collected(
      decodeStreamForResponses(finishedCallStream(1, [{ index: 0, function: { name: 'Bash' } }])),
    );

    expect(toolOpenings(events).map((opening) => opening.id)).toEqual(['call_chatcmpl_1_0']);
  });
});

describe('a streamed tool call whose name never arrives', () => {
  it('should reach a Claude target under a synthesized name with id and arguments intact', async () => {
    const events = await collected(decodeStream(finishedCallStream(0, [anonymousCall])));

    expect(toolOpenings(events)).toEqual([{ kind: 'tool', id: 'call_a', name: 'tool_0' }]);
    expect(argumentDeltas(events)).toEqual(['{"city":"Paris"}']);
  });

  it('should reach a Responses target unnamed, leaving the declared tool to name it', async () => {
    const events = await collected(
      decodeStreamForResponses(finishedCallStream(0, [anonymousCall])),
    );

    expect(toolOpenings(events)).toEqual([{ kind: 'tool', id: 'call_a', name: '' }]);
    expect(argumentDeltas(events)).toEqual(['{"city":"Paris"}']);
  });

  it('should end the turn in tool use rather than a plain stop', async () => {
    const events = await collected(decodeStream(finishedCallStream(0, [anonymousCall])));

    expect(events.at(-1)).toEqual({ type: 'message-end', stopReason: 'tool_use', usage: {} });
  });

  it('should give two anonymous calls of one choice their own numbers', async () => {
    const events = await collected(
      decodeStream(
        finishedCallStream(0, [
          anonymousCall,
          { index: 1, id: 'call_b', function: { arguments: '[]' } },
        ]),
      ),
    );

    expect(toolOpenings(events)).toEqual([
      { kind: 'tool', id: 'call_a', name: 'tool_0' },
      { kind: 'tool', id: 'call_b', name: 'tool_1' },
    ]);
  });

  it('should number the name by the position the call holds inside its own choice', async () => {
    const events = await collected(decodeStream(finishedCallStream(1, [anonymousCall])));

    expect(toolOpenings(events)).toEqual([{ kind: 'tool', id: 'call_a', name: 'tool_0' }]);
  });
});

describe('a streamed tool call whose name follows its arguments', () => {
  it('should open under the name the stream finally sent', async () => {
    const events = await collected(
      decodeStream(
        chatStream([
          toolChunk(0, [{ index: 0, id: 'call_a', function: { arguments: '{"city":' } }]),
          toolChunk(0, [{ index: 0, function: { name: 'get_weather', arguments: '"Paris"}' } }]),
          toolFinish(0),
          { type: 'done' },
        ]),
      ),
    );

    expect(toolOpenings(events)).toEqual([{ kind: 'tool', id: 'call_a', name: 'get_weather' }]);
    expect(argumentDeltas(events)).toEqual(['{"city":"Paris"}']);
  });
});

describe('a tool call delta carrying no id, no name, and no arguments', () => {
  it('should open no block and leave the turn ending without tool use', async () => {
    const events = await collected(decodeStream(finishedCallStream(0, [{ index: 0 }])));

    expect(toolOpenings(events)).toEqual([]);
    expect(events.at(-1)).toEqual({ type: 'message-end', stopReason: 'end', usage: {} });
  });
});
