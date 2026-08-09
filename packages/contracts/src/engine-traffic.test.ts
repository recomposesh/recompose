import { describe, expect, test } from 'vitest';

import { gatewayTrafficSchema, requestOutcomeSchema } from './engine-traffic';

const servedAt = 1_754_600_000_000;

const served = { outcome: 'served', at: servedAt };

const failed = {
  outcome: 'failed',
  at: servedAt,
  status: 429,
  detail: 'The target is turning requests away for now.',
};

describe('what the last request through a virtual model came to', () => {
  test('a request that answered well carries only when it answered', () => {
    expect(requestOutcomeSchema.parse(served)).toEqual(served);
  });

  test('a request that failed carries the status and a sentence a person can read', () => {
    expect(requestOutcomeSchema.parse(failed)).toEqual(failed);
  });

  test('an outcome neither served nor failed is refused', () => {
    expect(() => requestOutcomeSchema.parse({ outcome: 'pending', at: servedAt })).toThrow();
  });

  test('a served outcome carrying a status is refused, because nothing went wrong to report', () => {
    expect(() => requestOutcomeSchema.parse({ ...served, status: 200 })).toThrow();
  });

  test('a served outcome carrying a detail is refused, because there is no failure to explain', () => {
    expect(() => requestOutcomeSchema.parse({ ...served, detail: 'all well' })).toThrow();
  });

  test('a failed outcome missing its status is refused', () => {
    const { status, ...withoutTheStatus } = failed;

    expect(status).toBe(429);
    expect(() => requestOutcomeSchema.parse(withoutTheStatus)).toThrow();
  });

  test('a failed outcome missing its detail is refused', () => {
    const { detail, ...withoutTheDetail } = failed;

    expect(detail).toContain('target');
    expect(() => requestOutcomeSchema.parse(withoutTheDetail)).toThrow();
  });

  test('a blank detail is refused, because a red cable would offer an empty sentence', () => {
    expect(() => requestOutcomeSchema.parse({ ...failed, detail: '   ' })).toThrow();
  });

  test('a status no answer could carry is refused', () => {
    expect(() => requestOutcomeSchema.parse({ ...failed, status: 42 })).toThrow();
    expect(() => requestOutcomeSchema.parse({ ...failed, status: 600 })).toThrow();
  });

  test('a moment before the epoch is refused, because no request answered then', () => {
    expect(() => requestOutcomeSchema.parse({ ...served, at: -1 })).toThrow();
  });

  test('no outcome carries a request or an answer body', () => {
    expect(() => requestOutcomeSchema.parse({ ...served, body: 'hello' })).toThrow();
    expect(() => requestOutcomeSchema.parse({ ...failed, response: 'rate limited' })).toThrow();
  });
});

describe('the traffic snapshot the whole app reads', () => {
  test('it holds one outcome per virtual model under the gateway serving it', () => {
    const snapshot = { personal: { fast: served }, work: { deep: failed } };

    expect(gatewayTrafficSchema.parse(snapshot)).toEqual(snapshot);
  });

  test('a gateway nothing has flowed through yet holds an empty set of models', () => {
    expect(gatewayTrafficSchema.parse({ personal: {} })).toEqual({ personal: {} });
  });

  test('a snapshot keyed by something no gateway could be named is refused', () => {
    expect(() => gatewayTrafficSchema.parse({ Personal: { fast: served } })).toThrow();
  });

  test('a snapshot keyed by something no virtual model could be named is refused', () => {
    expect(() => gatewayTrafficSchema.parse({ personal: { Fast: served } })).toThrow();
  });
});
