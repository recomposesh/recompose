import type { Crossing, JsonObject } from './gateway-wire';

import { answeredBy } from './dialect/anthropic-attribution';
import { isResponsesAnswer } from './dialect/responses-answer-shape';
import { responsesAnsweredBy } from './dialect/responses-attribution';
import { restoreResponsesToolResponse } from './dialect/responses-tool-restoration';
import { isAnthropicAnswer } from './gateway-response-translation';
import { isJsonObject } from './gateway-wire';

export function restoredResponsesAnswer(crossing: Crossing, value: unknown): unknown {
  if (crossing.dialect !== 'responses' || !isJsonObject(value) || !isResponsesAnswer(value)) {
    return value;
  }

  return restoreResponsesToolResponse(value, crossing.responsesToolRefs ?? {});
}

function attributedAnthropic(crossing: Crossing, value: JsonObject): unknown {
  return isAnthropicAnswer(value) ? answeredBy(value, crossing.providerModel) : value;
}

function attributedResponses(crossing: Crossing, value: JsonObject): unknown {
  if (!isResponsesAnswer(value)) return value;

  const answer = responsesAnsweredBy(value, crossing.virtualModel);
  const tools = crossing.raw['tools'];

  return Array.isArray(tools) ? { ...answer, tools } : answer;
}

export function attributedAnswer(crossing: Crossing, value: unknown): unknown {
  if (!isJsonObject(value)) return value;
  if (crossing.dialect === 'anthropic') return attributedAnthropic(crossing, value);
  if (crossing.dialect === 'responses') return attributedResponses(crossing, value);

  return value;
}
