import { describe, expect, test } from 'vitest';

import { logRowSchema, providerMessageOf } from './engine-logs';
import { served, unreachable } from './engine-logs.testkit';

describe('the diagnosis a failed request carries', () => {
  const walked = {
    ...unreachable,
    diagnosis: {
      router: 'failover',
      tried: [
        { child: 'claude-sonnet-4-5', why: 'refused with 429' },
        { child: 'gpt-5-mini', why: 'has no credential' },
      ],
    },
  };

  test('a failed request names the router that stood in its way and every child it reached', () => {
    expect(logRowSchema.parse(walked)).toEqual(walked);
  });

  test('a request refused before it reached any child names the router alone', () => {
    const empty = { ...unreachable, diagnosis: { router: 'conditional' } };

    expect(logRowSchema.parse(empty)).toEqual(empty);
  });

  test("a provider that explained itself has its own words beside the gateway's reading", () => {
    const quoted = {
      ...served,
      status: 429,
      failure: 'The target is turning requests away for now.',
      diagnosis: { upstreamMessage: 'You exceeded your current quota for this month.' },
    };

    expect(logRowSchema.parse(quoted)).toEqual(quoted);
  });

  test('a row carrying no diagnosis still parses, because every row before this carried none', () => {
    expect(logRowSchema.parse(unreachable)).toEqual(unreachable);
  });

  test('the children a diagnosis names stand frozen, so no reader reshapes what another holds', () => {
    const parsed = logRowSchema.parse(walked);

    expect(Object.isFrozen(parsed.diagnosis?.tried)).toBe(true);
  });

  test('a diagnosis that names nothing is refused, because an empty reading reads as none', () => {
    expect(() => logRowSchema.parse({ ...unreachable, diagnosis: {} })).toThrow();
    expect(() => logRowSchema.parse({ ...unreachable, diagnosis: { tried: [] } })).toThrow();
  });

  test('a diagnosis on a request that succeeded is refused, because nothing failed to explain', () => {
    expect(() => logRowSchema.parse({ ...served, diagnosis: { router: 'failover' } })).toThrow();
  });

  test('a child nothing can be read by is refused', () => {
    const cooling = { child: '  ', why: 'stands cooling' };
    const nameless = { ...unreachable, diagnosis: { tried: [cooling] } };
    const reasonless = { ...unreachable, diagnosis: { tried: [{ child: 'gpt-5-mini', why: '' }] } };

    expect(() => logRowSchema.parse(nameless)).toThrow();
    expect(() => logRowSchema.parse(reasonless)).toThrow();
  });
});

describe('what a diagnosis still may not carry', () => {
  const quoting = (upstreamMessage: unknown) => ({
    ...unreachable,
    diagnosis: { upstreamMessage },
  });

  test('a provider body is refused where only its message belongs', () => {
    expect(() => logRowSchema.parse(quoting('{"error":{"message":"quota exceeded"}}'))).toThrow();
    expect(() => logRowSchema.parse(quoting('[{"role":"user","content":"my plan"}]'))).toThrow();
  });

  test('a run of stream events is refused where a message belongs', () => {
    expect(() => logRowSchema.parse(quoting('data: {"type":"error"}\n\n'))).toThrow();
    expect(() => logRowSchema.parse(quoting('event: error\ndata: nope'))).toThrow();
  });

  test('a message longer than a sentence is refused, because a dump is a body', () => {
    expect(() => logRowSchema.parse(quoting('x'.repeat(281)))).toThrow();
    expect(logRowSchema.parse(quoting('x'.repeat(280)))).toBeDefined();
  });

  test('a blank message is refused, because a quote of nothing quotes nothing', () => {
    expect(() => logRowSchema.parse(quoting('   '))).toThrow();
  });

  test('a refused quote says what the field must carry', () => {
    expect(() => logRowSchema.parse(quoting('{"prompt":"my secret plan"}'))).toThrow(
      'must be a message rather than a body',
    );
  });

  test('a diagnosis naming a field this contract never defined is refused', () => {
    expect(() =>
      logRowSchema.parse({ ...unreachable, diagnosis: { router: 'failover', requestBody: '{}' } }),
    ).toThrow();
  });

  test('a child naming a field this contract never defined is refused', () => {
    const smuggled = { child: 'gpt-5-mini', why: 'stands cooling', prompt: 'my secret plan' };

    const smuggling = { ...unreachable, diagnosis: { tried: [smuggled] } };

    expect(() => logRowSchema.parse(smuggling)).toThrow();
  });
});

describe('which of a provider s own words a row may carry', () => {
  test('a sentence a provider sent is admitted as it stands', () => {
    expect(providerMessageOf('You exceeded your current quota.')).toBe(
      'You exceeded your current quota.',
    );
  });

  test('a message is trimmed, because the surrounding space quotes nothing', () => {
    expect(providerMessageOf('  rate limited  ')).toBe('rate limited');
  });

  test('a body handed over whole is admitted as nothing at all', () => {
    expect(providerMessageOf('{"error":{"message":"quota"}}')).toBeUndefined();
    expect(providerMessageOf('[1,2]')).toBeUndefined();
    expect(providerMessageOf('data: {"type":"error"}')).toBeUndefined();
  });

  test('a message too long to be a sentence is cut to the span a row carries', () => {
    expect(providerMessageOf('x'.repeat(400))).toBe('x'.repeat(280));
  });

  test('a quote of nothing is admitted as nothing', () => {
    expect(providerMessageOf('   ')).toBeUndefined();
  });

  test('what it admits is what a row accepts, so no quote can ever cost a row its place', () => {
    const admitted = providerMessageOf('  You exceeded your current quota.  ');

    expect(
      logRowSchema.parse({ ...unreachable, diagnosis: { upstreamMessage: admitted } }).diagnosis,
    ).toEqual({ upstreamMessage: 'You exceeded your current quota.' });
  });
});
