import type {
  HubContentBlock,
  HubResponse,
  HubStreamEvent,
  HubTextBlock,
  HubThinkingBlock,
  HubToolUseBlock,
} from './hub';

type MediaBlock = Extract<HubContentBlock, { type: 'image' | 'audio' | 'video' | 'document' }>;

function isMedia(block: HubContentBlock): block is MediaBlock {
  return ['image', 'audio', 'video', 'document'].includes(block.type);
}

function messageBeginOf(response: HubResponse): HubStreamEvent {
  return {
    type: 'message-begin',
    usage: response.usage,
    ...(response.id === undefined ? {} : { id: response.id }),
    ...(response.model === undefined ? {} : { model: response.model }),
  };
}

function messageEndOf(response: HubResponse): HubStreamEvent {
  return {
    type: 'message-end',
    stopReason: response.stopReason,
    usage: response.usage,
    ...(response.stopSequence === undefined ? {} : { stopSequence: response.stopSequence }),
  };
}

function signatureEvents(signature: string | undefined, index: number): HubStreamEvent[] {
  return signature === undefined
    ? []
    : [{ type: 'block-delta', index, delta: { kind: 'signature', signature } }];
}

function textEvents(block: HubTextBlock, index: number): HubStreamEvent[] {
  return [
    { type: 'block-open', index, opening: { kind: 'text' } },
    { type: 'block-delta', index, delta: { kind: 'text', text: block.text } },
    ...signatureEvents(block.signature, index),
    { type: 'block-close', index },
  ];
}

function thinkingEvents(block: HubThinkingBlock, index: number): HubStreamEvent[] {
  return [
    { type: 'block-open', index, opening: { kind: 'thinking' } },
    { type: 'block-delta', index, delta: { kind: 'thinking', text: block.text } },
    ...signatureEvents(block.signature, index),
    { type: 'block-close', index },
  ];
}

function toolEvents(block: HubToolUseBlock, index: number): HubStreamEvent[] {
  return [
    { type: 'block-open', index, opening: { kind: 'tool', id: block.id, name: block.name } },
    {
      type: 'block-delta',
      index,
      delta: { kind: 'json-args', partialJson: JSON.stringify(block.input ?? {}) },
    },
    ...signatureEvents(block.signature, index),
    { type: 'block-close', index },
  ];
}

function indexedBlockEvents(block: HubContentBlock, index: number): HubStreamEvent[] | null {
  if (block.type === 'text') return textEvents(block, index);
  if (block.type === 'thinking') return thinkingEvents(block, index);

  return block.type === 'tool_use' ? toolEvents(block, index) : null;
}

export function hubStreamFromResponse(response: HubResponse): HubStreamEvent[] | null {
  const events: HubStreamEvent[] = [messageBeginOf(response)];
  let index = 0;

  for (const block of response.content) {
    if (isMedia(block)) {
      events.push({ type: 'media', block });
      continue;
    }

    const blockEvents = indexedBlockEvents(block, index);

    if (blockEvents === null) return null;

    events.push(...blockEvents);
    index += 1;
  }

  events.push(messageEndOf(response));

  return events;
}

export async function* hubEventsOf(
  events: readonly HubStreamEvent[],
): AsyncIterable<HubStreamEvent> {
  await Promise.resolve();

  for (const event of events) {
    yield event;
  }
}
