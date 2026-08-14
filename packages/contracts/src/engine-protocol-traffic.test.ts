import { describe, expect, test } from 'vitest';

import { engineReportSchema, engineTrafficReportSchema } from './engine-protocol';

const served = {
  kind: 'traffic',
  slug: 'personal',
  virtualModel: 'fast',
  routeNode: 'only',
  request: { outcome: 'served', at: 1_754_600_000_000 },
};

const failed = {
  kind: 'traffic',
  slug: 'personal',
  virtualModel: 'fast',
  routeNode: 'only',
  request: {
    outcome: 'failed',
    at: 1_754_600_000_000,
    status: 502,
    detail: 'The gateway could not reach the target.',
  },
};

describe('what the child tells the parent about a finished request', () => {
  test('a served request names its gateway and its virtual model', () => {
    expect(engineTrafficReportSchema.parse(served)).toEqual(served);
  });

  test('a failed request carries the status and the sentence explaining it', () => {
    expect(engineTrafficReportSchema.parse(failed)).toEqual(failed);
  });

  test('a report answering a directive is refused, because nothing asked for it', () => {
    expect(() => engineTrafficReportSchema.parse({ ...served, answers: 'directive-1' })).toThrow();
  });

  test('a report naming no virtual model is refused, because no cable would own it', () => {
    const { virtualModel, ...withoutTheModel } = served;

    expect(virtualModel).toBe('fast');
    expect(() => engineTrafficReportSchema.parse(withoutTheModel)).toThrow();
  });

  test('a report carrying what was asked is refused, so no prompt can cross', () => {
    expect(() => engineTrafficReportSchema.parse({ ...served, prompt: 'hello' })).toThrow();
  });

  test('a report carrying a credential is refused', () => {
    expect(() => engineTrafficReportSchema.parse({ ...served, credential: 'sk-live' })).toThrow();
  });

  test('traffic rides beside the answers, so no directive report reads as traffic', () => {
    expect(() => engineReportSchema.parse(served)).toThrow();
  });
});
