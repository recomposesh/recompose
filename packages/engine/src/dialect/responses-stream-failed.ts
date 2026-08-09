import type { HubStreamErrorPayload } from './hub';
import type { ResponsesOutputItem, ResponsesStreamEvent } from './responses-wire';

import { translatedResponseId } from './responses-shared';

type FailingResponse = {
  id: string | undefined;
  model: string | undefined;
  output: readonly ResponsesOutputItem[];
};

export function responsesFailedEvent(
  response: FailingResponse,
  error: HubStreamErrorPayload,
): ResponsesStreamEvent {
  return {
    type: 'response.failed',
    response: {
      id: response.id ?? translatedResponseId,
      ...(response.model === undefined ? {} : { model: response.model }),
      status: 'failed',
      output: response.output,
      error: { type: error.type, message: error.message },
    },
  };
}
