import { describe, expect, test } from 'vitest';

import { DEFAULT_COOLDOWN_MS } from './cooldown-signal';
import { classify, classifyJudge } from './outcome-classification';

const NOW = 1_700_000_000_000;

const RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504, 529];

const REQUEST_SCOPED_STATUSES = [400, 401, 402, 403, 404, 409, 413, 418, 422, 451];

describe('the failures another child could still cure', () => {
  test('a transport failure carrying no status moves the walk on', () => {
    const verdict = classify({ kind: 'transport-failure' }, NOW);

    expect(verdict).toEqual({
      verdict: 'move-on',
      coolUntilMs: NOW + DEFAULT_COOLDOWN_MS,
      reason: { because: 'transport-failure' },
    });
  });

  test('every status the table calls retryable moves the walk on', () => {
    for (const status of RETRYABLE_STATUSES) {
      expect(classify({ kind: 'refused', status, answer: 'upstream' }, NOW).verdict).toBe(
        'move-on',
      );
    }
  });

  test('a refusal the normalizer calls retryable moves on whatever its status reads', () => {
    for (const status of REQUEST_SCOPED_STATUSES) {
      const verdict = classify(
        { kind: 'refused', status, retryableHint: true, answer: 'upstream' },
        NOW,
      );

      expect(verdict.verdict).toBe('move-on');
    }
  });

  test('a stream error before the first downstream byte moves on when its status is retryable', () => {
    const verdict = classify(
      { kind: 'stream-error-before-commit', equivalentStatus: 503, answer: 'upstream' },
      NOW,
    );

    expect(verdict).toEqual({
      verdict: 'move-on',
      coolUntilMs: NOW + DEFAULT_COOLDOWN_MS,
      reason: { because: 'stream-error', status: 503 },
    });
  });
});

describe('a child the walk could not spend at all', () => {
  test('a credential the parent could not open cools that child and no other', () => {
    const verdict = classify({ kind: 'grant-missing-credential' }, NOW);

    expect(verdict).toEqual({
      verdict: 'move-on',
      coolUntilMs: NOW + DEFAULT_COOLDOWN_MS,
      reason: { because: 'missing-credential' },
    });
  });

  test('an account that left the registry cools that child and no other', () => {
    const verdict = classify({ kind: 'grant-missing-target' }, NOW);

    expect(verdict).toEqual({
      verdict: 'move-on',
      coolUntilMs: NOW + DEFAULT_COOLDOWN_MS,
      reason: { because: 'missing-target' },
    });
  });

  test('the two are told apart, so the refusal names the repair the route node needs', () => {
    const missingTarget = classify({ kind: 'grant-missing-target' }, NOW);
    const missingCredential = classify({ kind: 'grant-missing-credential' }, NOW);

    expect(missingTarget).not.toEqual(missingCredential);
  });
});

describe('the failures no other child could cure', () => {
  test('every status the table calls request-scoped answers the caller', () => {
    for (const status of REQUEST_SCOPED_STATUSES) {
      expect(classify({ kind: 'refused', status, answer: 'upstream' }, NOW)).toEqual({
        verdict: 'answer',
        answer: 'upstream',
      });
    }
  });

  test('a refusal the normalizer calls final answers whatever its status reads', () => {
    for (const status of RETRYABLE_STATUSES) {
      const verdict = classify(
        { kind: 'refused', status, retryableHint: false, answer: 'upstream' },
        NOW,
      );

      expect(verdict).toEqual({ verdict: 'answer', answer: 'upstream' });
    }
  });

  test('a stream error before the first downstream byte answers on any other status', () => {
    const verdict = classify(
      { kind: 'stream-error-before-commit', equivalentStatus: 400, answer: 'upstream' },
      NOW,
    );

    expect(verdict).toEqual({ verdict: 'answer', answer: 'upstream' });
  });

  test('an answer that served hands the caller what the provider sent', () => {
    expect(classify({ kind: 'served', answer: 'upstream' }, NOW)).toEqual({
      verdict: 'answer',
      answer: 'upstream',
    });
  });
});

describe('where the cooling time comes from when a child stands down', () => {
  test('the refusal the walk moves past names the status it carried', () => {
    const verdict = classify({ kind: 'refused', status: 429, answer: 'upstream' }, NOW);

    expect(verdict).toEqual({
      verdict: 'move-on',
      coolUntilMs: NOW + DEFAULT_COOLDOWN_MS,
      reason: { because: 'refused', status: 429 },
    });
  });

  test('a provider that named its own retry time sets the cooling exactly', () => {
    const promised = NOW + 12_000;

    const verdict = classify(
      {
        kind: 'refused',
        status: 429,
        cooling: { coolUntilMs: promised, promised: true },
        answer: 'upstream',
      },
      NOW,
    );

    expect(verdict).toEqual({
      verdict: 'move-on',
      coolUntilMs: promised,
      retryAtMs: promised,
      reason: { because: 'refused', status: 429 },
    });
  });

  test('a stream error carrying its own retry time sets the cooling exactly', () => {
    const promised = NOW + 3_000;

    const verdict = classify(
      {
        kind: 'stream-error-before-commit',
        equivalentStatus: 429,
        cooling: { coolUntilMs: promised, promised: true },
        answer: 'upstream',
      },
      NOW,
    );

    expect(verdict).toEqual({
      verdict: 'move-on',
      coolUntilMs: promised,
      retryAtMs: promised,
      reason: { because: 'stream-error', status: 429 },
    });
  });
});

describe('a stand-down a provider never promised stays the walk own guess', () => {
  test('a refusal reporting only a reset window cools to it without promising a caller a wait', () => {
    const reopening = NOW + 45_000;

    const verdict = classify(
      {
        kind: 'refused',
        status: 500,
        cooling: { coolUntilMs: reopening, promised: false },
        answer: 'upstream',
      },
      NOW,
    );

    expect(verdict).toEqual({
      verdict: 'move-on',
      coolUntilMs: reopening,
      reason: { because: 'refused', status: 500 },
    });
  });

  test('a stream error reporting only a reset window promises a caller nothing either', () => {
    const reopening = NOW + 9_000;

    const verdict = classify(
      {
        kind: 'stream-error-before-commit',
        equivalentStatus: 503,
        cooling: { coolUntilMs: reopening, promised: false },
        answer: 'upstream',
      },
      NOW,
    );

    expect(verdict).toEqual({
      verdict: 'move-on',
      coolUntilMs: reopening,
      reason: { because: 'stream-error', status: 503 },
    });
  });
});

describe('the judge readings that route a request rather than refuse it', () => {
  test('a judge that answered a label hands the walk that label to follow', () => {
    expect(classifyJudge({ heard: 'answer', label: 'code' })).toEqual({
      verdict: 'answered',
      label: 'code',
    });
  });

  test('a judge that wrote nothing still counts as an answer the branches can read', () => {
    expect(classifyJudge({ heard: 'answer', label: '' })).toEqual({
      verdict: 'answered',
      label: '',
    });
  });

  test('a judge refusal sends the request to the else branch instead of refusing the caller', () => {
    expect(classifyJudge({ heard: 'refusal' })).toEqual({ verdict: 'to-else' });
  });

  test('a judge past its timeout budget sends the request to the else branch', () => {
    expect(classifyJudge({ heard: 'timeout' })).toEqual({ verdict: 'to-else' });
  });
});

describe('what a walk falls back on when no provider promises anything', () => {
  test('a refusal naming no retry time falls back on the recorded default', () => {
    const verdict = classify({ kind: 'refused', status: 500, answer: 'upstream' }, NOW);

    expect(verdict).toEqual({
      verdict: 'move-on',
      coolUntilMs: NOW + DEFAULT_COOLDOWN_MS,
      reason: { because: 'refused', status: 500 },
    });
  });

  test('a walk that moves past a guessed cooling never claims the provider promised it', () => {
    const verdict = classify({ kind: 'transport-failure' }, NOW);

    expect(verdict).not.toHaveProperty('retryAtMs');
  });
});
