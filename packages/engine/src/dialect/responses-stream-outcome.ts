import type { HubStreamEvent } from './hub';
import type { ResponsesOutputItem } from './responses-wire';

/**
 * Whether the turn thought and then said nothing, which is not a completed response.
 *
 * @summary Reasoning is not an answer. A stream that opened a thinking block and closed without
 * producing an output item has not finished the turn, so reporting it completed would tell a
 * caller a response arrived when none did. A turn that never reasoned is left alone, because an
 * empty output there means the wire had nothing to carry rather than nothing to say.
 */
export function reasonedWithoutAnswering(
  state: { reasoned: boolean },
  output: readonly ResponsesOutputItem[],
): boolean {
  return state.reasoned && output.length === 0;
}

/** Whether an event ends the stream, either by refusing it or by closing the turn. */
export function isTerminalHubEvent(event: HubStreamEvent): boolean {
  return event.type === 'stream-error' || event.type === 'message-end';
}
