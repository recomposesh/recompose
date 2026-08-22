import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { refusalResponse } from './gateway-wire';
import {
  chainedTurn,
  emptyRouter,
  exhaustedRouter,
  renderRefusal,
  unjudgedRequest,
} from './refusals';

const NOON = Date.parse('2026-08-14T12:00:00.000Z');

function messageOf(rendered: ReturnType<typeof renderRefusal>): string {
  return rendered.body.error.message;
}

describe('a router holding no child refuses before any request leaves the machine', () => {
  it('answers a 502 naming the router and the virtual model', () => {
    const rendered = renderRefusal('chat-completions', emptyRouter('Codex', 'fast', 'Failover'));

    expect(rendered.status).toBe(502);
    expect(rendered.body).toEqual({
      error: {
        message:
          'The router "Failover" in the gateway "Codex" holds no child, so the virtual model "fast" cannot serve.',
        type: 'invalid_request_error',
        param: null,
        code: 'empty_router',
      },
    });
  });

  it('joins the config-fault family in the Anthropic envelope', () => {
    const rendered = renderRefusal('anthropic', emptyRouter('Codex', 'fast', 'Failover'));

    expect(rendered.body).toEqual({
      type: 'error',
      error: {
        type: 'api_error',
        message:
          'The router "Failover" in the gateway "Codex" holds no child, so the virtual model "fast" cannot serve.',
      },
    });
  });

  it('carries no retry time, because waiting cures nothing a person has not wired', () => {
    expect(renderRefusal('anthropic', emptyRouter('Codex', 'fast', 'Failover'))).not.toHaveProperty(
      'retryAfterSeconds',
    );
  });
});

describe('an exhausted router accounts for every child it tried', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOON);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const attempts = [
    { child: 'gpt-5-mini', why: 'refused with 429' },
    { child: 'claude-sonnet-4-5', why: 'the connection failed' },
  ];

  it('names each child with the reason it could not serve', () => {
    const rendered = renderRefusal(
      'anthropic',
      exhaustedRouter('Codex', 'fast', 'Failover', attempts),
    );

    expect(messageOf(rendered)).toBe(
      'The router "Failover" in the gateway "Codex" has no child left to try for the virtual model "fast": gpt-5-mini refused with 429, claude-sonnet-4-5 the connection failed.',
    );
  });

  it('answers 502 while one attempted child promised no retry time', () => {
    const rendered = renderRefusal(
      'chat-completions',
      exhaustedRouter('Codex', 'fast', 'Failover', attempts),
    );

    expect(rendered.status).toBe(502);
    expect(rendered).not.toHaveProperty('retryAfterSeconds');
  });

  it('carries the code every dialect reads it by', () => {
    const rendered = renderRefusal(
      'responses',
      exhaustedRouter('Codex', 'fast', 'Failover', attempts),
    );

    expect(rendered.body).toMatchObject({ error: { code: 'exhausted_router' } });
  });
});

describe('an exhausted router says when trying again can work', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOON);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const attempts = [{ child: 'gpt-5-mini', why: 'refused with 429' }];

  it('answers 429 carrying the earliest retry time as delay seconds', () => {
    const rendered = renderRefusal(
      'chat-completions',
      exhaustedRouter('Codex', 'fast', 'Failover', attempts, NOON + 30_000),
    );

    expect(rendered.status).toBe(429);
    expect(rendered.retryAfterSeconds).toBe(30);
  });

  it('says it in the same delay seconds the header carries', () => {
    const rendered = renderRefusal(
      'anthropic',
      exhaustedRouter('Codex', 'fast', 'Failover', attempts, NOON + 30_000),
    );

    expect(messageOf(rendered)).toContain('Try again in 30 seconds.');
  });

  it('rounds a part second up, so a caller never returns before the window reopens', () => {
    const rendered = renderRefusal(
      'chat-completions',
      exhaustedRouter('Codex', 'fast', 'Failover', attempts, NOON + 1200),
    );

    expect(rendered.retryAfterSeconds).toBe(2);
  });

  it('reads a retry time already past as no wait at all', () => {
    const rendered = renderRefusal(
      'chat-completions',
      exhaustedRouter('Codex', 'fast', 'Failover', attempts, NOON - 5000),
    );

    expect(rendered.retryAfterSeconds).toBe(0);
  });
});

describe('a chained turn under round-robin refuses rather than rotating', () => {
  it('answers 400 naming the router and the way out', () => {
    const rendered = renderRefusal('responses', chainedTurn('Codex', 'fast', 'Round-robin'));

    expect(rendered.status).toBe(400);
    expect(rendered.body).toEqual({
      error: {
        message:
          'The router "Round-robin" in the gateway "Codex" spreads requests across accounts, so it cannot carry a turn that resumes server-side state for the virtual model "fast". Switch this router to failover, or start a conversation that doesn\'t resume server-side state.',
        type: 'invalid_request_error',
        code: 'chained_turn',
        param: null,
      },
    });
  });

  it('reads as a caller mistake in the Anthropic envelope, not a gateway fault', () => {
    const rendered = renderRefusal('anthropic', chainedTurn('Codex', 'fast', 'Round-robin'));

    expect(rendered.body).toMatchObject({ error: { type: 'invalid_request_error' } });
  });
});

describe('a conditional router whose judge reached no verdict refuses the request', () => {
  it('answers 503 naming the router, the model, and the else child it declined to use', () => {
    const rendered = renderRefusal('responses', unjudgedRequest('Codex', 'fast', 'Conditional'));

    expect(rendered.status).toBe(503);
    expect(rendered.body).toEqual({
      error: {
        message:
          'The router "Conditional" in the gateway "Codex" got no verdict from its judge, so the virtual model "fast" refused this request rather than sending it to the else child. Check that the judge is bound to an account and a model that can answer.',
        type: 'invalid_request_error',
        code: 'unjudged_request',
        param: null,
      },
    });
  });

  it('reads as a gateway fault in the Anthropic envelope, never as a caller mistake', () => {
    const rendered = renderRefusal('anthropic', unjudgedRequest('Codex', 'fast', 'Conditional'));

    expect(rendered.body).toMatchObject({ error: { type: 'api_error' } });
  });

  it('promises no wait, because nothing about a judge says when it comes back', () => {
    const rendered = renderRefusal('anthropic', unjudgedRequest('Codex', 'fast', 'Conditional'));

    expect(rendered.retryAfterSeconds).toBeUndefined();
  });
});

describe('the one seam that turns a rendered refusal into a response writes the wait', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOON);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes Retry-After as delay seconds when the refusal names a retry time', () => {
    const response = refusalResponse(
      'anthropic',
      exhaustedRouter(
        'Codex',
        'fast',
        'Failover',
        [{ child: 'gpt-5-mini', why: 'refused with 429' }],
        NOON + 45_000,
      ),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('45');
  });

  it('writes no Retry-After when the refusal names no retry time', () => {
    const response = refusalResponse('anthropic', emptyRouter('Codex', 'fast', 'Failover'));

    expect(response.headers.get('retry-after')).toBeNull();
  });
});
