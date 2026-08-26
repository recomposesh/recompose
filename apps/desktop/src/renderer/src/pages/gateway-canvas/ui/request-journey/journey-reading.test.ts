import { describe, expect, it } from 'vitest';

import { SERVED_AT, servedRequest, workKey } from '../../testing/gateway-canvas.testkit';
import { copiedJourney, journeyOf } from './journey-reading';

const unplaced = servedRequest({
  origin: 'gateway',
  status: 502,
  provider: undefined,
  accountId: undefined,
  providerModel: undefined,
  durationMs: undefined,
  tokens: undefined,
  failure: 'The gateway "My gateway" has no child left to try for the virtual model "fast".',
  diagnosis: {
    router: 'Failover',
    tried: [
      { child: 'claude-sonnet-4-5', why: 'refused with 429' },
      { child: 'gpt-5-mini', why: 'has no credential' },
    ],
  },
});

function readingFor(label: string, logged = unplaced): readonly string[] {
  return journeyOf(logged, undefined)
    .filter((line) => line.label === label)
    .map((line) => line.reading);
}

describe('the journey one request took, end to end', () => {
  it('opens with when the request landed and what it asked for', () => {
    expect(journeyOf(servedRequest(), workKey).slice(0, 3)).toEqual([
      { label: 'Time', reading: '14:22:09' },
      { label: 'Method', reading: 'POST' },
      { label: 'Asked for', reading: 'fast' },
    ]);
  });

  it('names the model the virtual model resolved to and the account that paid for it', () => {
    expect(readingFor('Resolved to', servedRequest())).toEqual(['claude-haiku-4-5']);
    expect(journeyOf(servedRequest(), workKey)).toContainEqual({
      label: 'Served by',
      reading: 'anthropic · work',
    });
  });

  it('leaves out every line the request never filled, rather than printing an empty one', () => {
    const labels = journeyOf(unplaced, undefined).map((line) => line.label);

    expect(labels).not.toContain('Resolved to');
    expect(labels).not.toContain('Served by');
    expect(labels).not.toContain('Took');
    expect(labels).not.toContain('Provider said');
  });

  it('reads a request still in flight as live rather than as a status nothing answered', () => {
    const flying = servedRequest({ durationMs: undefined, status: 200 });

    expect(readingFor('Status', flying)).toEqual(['live']);
    expect(readingFor('Took', flying)).toEqual([]);
  });

  it('reads a served request by the status its provider actually answered with', () => {
    expect(readingFor('Status', servedRequest())).toEqual(['200']);
    expect(readingFor('Took', servedRequest())).toEqual(['0.9s']);
  });
});

describe("why a failed request ended there, in the gateway's words and the provider's", () => {
  it('names the router that stood in the way of a request no child could take', () => {
    expect(readingFor('Router')).toEqual(['Failover']);
  });

  it('names every child the gateway reached, each with what it did', () => {
    expect(readingFor('Tried')).toEqual([
      'claude-sonnet-4-5 refused with 429',
      'gpt-5-mini has no credential',
    ]);
  });

  it("reads the gateway's own sentence as the cause, which is what the caller was handed", () => {
    expect(readingFor('Cause')).toEqual([
      'The gateway "My gateway" has no child left to try for the virtual model "fast".',
    ]);
  });

  it('quotes the provider where one explained its own refusal', () => {
    const refused = servedRequest({
      status: 429,
      failure: 'The target is turning requests away for now.',
      diagnosis: { upstreamMessage: 'You exceeded your current quota.' },
    });

    expect(readingFor('Provider said', refused)).toEqual(['You exceeded your current quota.']);
  });
});

describe('the journey as one paste', () => {
  it('hands over every line it shows, in the order a person reads them', () => {
    expect(copiedJourney(unplaced, undefined)).toBe(
      [
        'Time: 14:22:09',
        'Method: POST',
        'Asked for: fast',
        'Status: 502',
        'Router: Failover',
        'Tried: claude-sonnet-4-5 refused with 429',
        'Tried: gpt-5-mini has no credential',
        'Cause: The gateway "My gateway" has no child left to try for the virtual model "fast".',
      ].join('\n'),
    );
  });

  it('hands over a served request as the account that served it, never as a raw id', () => {
    expect(copiedJourney(servedRequest({ at: SERVED_AT }), workKey)).toContain(
      'Served by: anthropic · work',
    );
  });
});
