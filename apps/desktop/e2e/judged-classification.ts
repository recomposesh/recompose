import { z } from 'zod';

import type { JudgeStub } from './judge-stub';

/** The labels a chat-completions judge is closed to, which is the offer the call actually carries. */
const labelsTheCallOffers = z.object({
  response_format: z.object({
    json_schema: z.object({
      schema: z.object({
        properties: z.object({ branch: z.object({ enum: z.array(z.string()) }) }),
      }),
    }),
  }),
});

/**
 * The one classification call a request spent, whole, as it left the machine.
 *
 * @summary The first is the one every scenario means: a broken answer earns a second, and a
 * scenario reading what the judge was offered is describing the offer a request made rather than
 * the retry a strange answer earned.
 */
export function theOnlyClassificationCall(judge: JudgeStub): string {
  const [first] = judge.classificationsAsked();

  if (first === undefined) {
    throw new Error('the judge received no classification call at all');
  }

  return first;
}

/** Every branch label a classification call let its judge answer with, in the order offered. */
export function labelsOffered(judge: JudgeStub): readonly string[] {
  const offered = labelsTheCallOffers.parse(JSON.parse(theOnlyClassificationCall(judge)));

  return offered.response_format.json_schema.schema.properties.branch.enum;
}
