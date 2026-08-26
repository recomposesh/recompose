import { describe, expect, test } from 'vitest';

import type { RouterRefusal } from './router-refusal-facts';
import type { UnjudgedCause } from './routing/outcome-classification';

import { routerFaultFacts } from './router-refusal-facts';

const EVERY_CAUSE: readonly UnjudgedCause[] = [
  'judge-call-failed',
  'judge-timed-out',
  'judge-standing-cooling',
  'unpinned-sealed-turn',
];

function aRouterThatReachedNoVerdict(because: UnjudgedCause): RouterRefusal {
  return {
    reason: 'unjudged-request',
    displayName: 'Codex',
    model: 'fast',
    routerName: 'Conditional',
    because,
  };
}

function messageFor(because: UnjudgedCause): string {
  return routerFaultFacts(aRouterThatReachedNoVerdict(because)).message;
}

describe('what a conditional router tells a caller about the verdict it never got', () => {
  test('a judge call that came back with nothing readable asks about the binding', () => {
    expect(messageFor('judge-call-failed')).toBe(
      'The router "Conditional" in the gateway "Codex" asked its judge and could not get an answer out of it, so the virtual model "fast" refused this request rather than sending it to the else child. Check that the judge is bound to an account and a model that can answer, and that its account still holds a working credential.',
    );
  });

  test('a judge that answered nothing in time names the control that sets the wait', () => {
    expect(messageFor('judge-timed-out')).toBe(
      'The router "Conditional" in the gateway "Codex" asked its judge and nothing came back within the judge timeout, so the virtual model "fast" refused this request rather than sending it to the else child. Raise the judge timeout on this router, or bind the judge to a model that answers faster.',
    );
  });

  test('a judge standing cooling says no call left the machine for this request at all', () => {
    expect(messageFor('judge-standing-cooling')).toBe(
      'The router "Conditional" in the gateway "Codex" did not ask its judge, which stands cooling after failing an earlier request, so the virtual model "fast" refused this request rather than sending it to the else child. Fix what stopped the judge answering, or bind this router to a judge that can answer.',
    );
  });

  test('a turn resuming server-held state says the judge was never reached, and why', () => {
    expect(messageFor('unpinned-sealed-turn')).toBe(
      'The router "Conditional" in the gateway "Codex" never reached its judge, because this turn resumes server-held state and no branch is pinned to the conversation, so the virtual model "fast" refused this request rather than sending it to the else child. Start a new conversation, so its opening turn earns a branch this router can keep.',
    );
  });

  test('no two causes read alike, so one sentence never stands in for four repairs', () => {
    expect(new Set(EVERY_CAUSE.map(messageFor)).size).toBe(EVERY_CAUSE.length);
  });
});

describe('what every refusal of a request nothing judged wears, whichever cause raised it', () => {
  test('every cause names the router, the gateway and the else child it declined to use', () => {
    const framed = EVERY_CAUSE.map(
      (because) =>
        messageFor(because).startsWith('The router "Conditional" in the gateway "Codex" ') &&
        messageFor(because).includes(
          'so the virtual model "fast" refused this request rather than sending it to the else child.',
        ),
    );

    expect(framed).toEqual([true, true, true, true]);
  });

  test('every cause reads as a service standing down rather than as a caller mistake', () => {
    const facts = EVERY_CAUSE.map((because) =>
      routerFaultFacts(aRouterThatReachedNoVerdict(because)),
    );

    expect(facts.map((fact) => fact.status)).toEqual([503, 503, 503, 503]);
    expect(facts.map((fact) => fact.code)).toEqual([
      'unjudged_request',
      'unjudged_request',
      'unjudged_request',
      'unjudged_request',
    ]);
    expect(facts.map((fact) => fact.anthropicType)).toEqual([
      'api_error',
      'api_error',
      'api_error',
      'api_error',
    ]);
  });

  test('no cause promises a wait, because nothing about a judge says when it comes back', () => {
    const waits = EVERY_CAUSE.map(
      (because) => routerFaultFacts(aRouterThatReachedNoVerdict(because)).retryAfterSeconds,
    );

    expect(waits).toEqual([undefined, undefined, undefined, undefined]);
  });
});
