import type { EngineRouting } from '@recompose/contracts';

import { describe, expect, it } from 'vitest';

import type { WalkNote } from './gateway-walk-notes';

import {
  attemptsRecorded,
  failedOutcome,
  notesThatCarriedARequest,
  nothingAnsweredFor,
} from './gateway-walk-notes';

const LADDER: EngineRouting = {
  entry: 'ladder',
  nodes: {
    ladder: { kind: 'router', policy: { mode: 'failover' }, children: ['child-1', 'child-2'] },
    'child-1': { kind: 'target', standing: { standing: 'bound', providerModel: 'gpt-5-mini' } },
    'child-2': { kind: 'target', standing: { standing: 'removed' } },
  },
};

function noteOf(reason: WalkNote['reason'], routeNode = 'child-1'): WalkNote {
  return { routeNode, reason };
}

function whyOf(note: WalkNote): string {
  return attemptsRecorded(LADDER, [note]).at(0)?.why ?? '';
}

describe('the reason a refusal gives for each child it names', () => {
  it('names the status a child refused with', () => {
    expect(whyOf(noteOf({ because: 'refused', status: 503 }))).toBe('refused with 503');
  });

  it('tells a mid-stream failure apart from a refusal, and keeps its status', () => {
    expect(whyOf(noteOf({ because: 'stream-error', status: 429 }))).toBe(
      'failed mid-stream with 429',
    );
  });

  it('says a child had no credential rather than naming a status no one answered with', () => {
    expect(whyOf(noteOf({ because: 'missing-credential' }))).toBe('has no credential');
  });

  it('says a child has no target when the account it named left the registry', () => {
    expect(whyOf(noteOf({ because: 'missing-target' }))).toBe('has no target');
  });

  it('says a child could not be reached when the connection carried nothing back', () => {
    expect(whyOf(noteOf({ because: 'transport-failure' }))).toBe('could not be reached');
  });

  it('says a child stands cooling, which is why it was never tried at all', () => {
    expect(whyOf(noteOf({ because: 'cooling' }))).toBe('stands cooling');
  });

  it('says a child stands ready, when only the branch this request took left it out', () => {
    expect(whyOf(noteOf({ because: 'off-branch' }))).toBe(
      'stands ready off the branch this request was judged onto',
    );
  });

  it('names the judge, rather than the branch, when nothing judged the request at all', () => {
    expect(whyOf(noteOf({ because: 'unjudged' }))).toBe(
      'stands ready while the judge named no branch and the request fell to the else child',
    );
  });
});

describe('the name a person reads a child by', () => {
  it('names a bound child by the model it serves, never by the node it sits in', () => {
    expect(attemptsRecorded(LADDER, [noteOf({ because: 'transport-failure' })])).toEqual([
      { child: 'gpt-5-mini', why: 'could not be reached' },
    ]);
  });

  it('falls back to the route node when the model left with the account', () => {
    expect(
      attemptsRecorded(LADDER, [noteOf({ because: 'missing-credential' }, 'child-2')]),
    ).toEqual([{ child: 'child-2', why: 'has no credential' }]);
  });

  it('falls back to the route node when the table holds no such node at all', () => {
    expect(attemptsRecorded(LADDER, [noteOf({ because: 'cooling' }, 'child-9')])).toEqual([
      { child: 'child-9', why: 'stands cooling' },
    ]);
  });

  it('keeps the order the walk handed over, so the refusal reads as the canvas draws', () => {
    const recorded = attemptsRecorded(LADDER, [
      noteOf({ because: 'refused', status: 429 }),
      noteOf({ because: 'cooling' }, 'child-2'),
    ]);

    expect(recorded.map((attempt) => attempt.child)).toEqual(['gpt-5-mini', 'child-2']);
  });

  it('records nothing at all when the walk touched no child', () => {
    expect(attemptsRecorded(LADDER, [])).toEqual([]);
  });
});

describe('only a child that carried a request earns a cable', () => {
  it('drops a cooling child, because it never carried one', () => {
    const kept = notesThatCarriedARequest([
      noteOf({ because: 'cooling' }),
      noteOf({ because: 'refused', status: 429 }, 'child-2'),
    ]);

    expect(kept).toEqual([{ routeNode: 'child-2', reason: { because: 'refused', status: 429 } }]);
  });

  it('drops a child a branch decision walked past, because nothing ever asked it', () => {
    const kept = notesThatCarriedARequest([
      noteOf({ because: 'off-branch' }),
      noteOf({ because: 'refused', status: 429 }, 'child-2'),
    ]);

    expect(kept).toEqual([{ routeNode: 'child-2', reason: { because: 'refused', status: 429 } }]);
  });

  it('drops a child no judgment ever placed the request past, for the same reason', () => {
    const kept = notesThatCarriedARequest([
      noteOf({ because: 'unjudged' }),
      noteOf({ because: 'refused', status: 429 }, 'child-2'),
    ]);

    expect(kept).toEqual([{ routeNode: 'child-2', reason: { because: 'refused', status: 429 } }]);
  });

  it('keeps every child the walk actually tried', () => {
    const tried: readonly WalkNote[] = [
      noteOf({ because: 'transport-failure' }),
      noteOf({ because: 'missing-credential' }, 'child-2'),
    ];

    expect(notesThatCarriedARequest(tried)).toEqual(tried);
  });
});

describe('what one failed attempt paints on its own cable', () => {
  it('paints the status the provider itself answered with', () => {
    expect(failedOutcome(noteOf({ because: 'refused', status: 429 }), 1200)).toEqual({
      outcome: 'failed',
      at: 1200,
      status: 429,
      detail: 'The child refused with 429.',
    });
  });

  it('paints a mid-stream failure with the status its error event equalled', () => {
    expect(failedOutcome(noteOf({ because: 'stream-error', status: 408 }), 1200)).toMatchObject({
      status: 408,
      detail: 'The child failed mid-stream with 408.',
    });
  });

  it('paints an unreachable status when no one answered with one', () => {
    expect(failedOutcome(noteOf({ because: 'transport-failure' }), 1200)).toMatchObject({
      status: 502,
      detail: 'The child could not be reached.',
    });
  });

  it('paints a credential failure as unreachable too, because no request was ever answered', () => {
    expect(failedOutcome(noteOf({ because: 'missing-credential' }), 1200)).toMatchObject({
      status: 502,
      detail: 'The child has no credential.',
    });
  });

  it('paints a departed account as unreachable too, and says which of the two it was', () => {
    expect(failedOutcome(noteOf({ because: 'missing-target' }), 1200)).toMatchObject({
      status: 502,
      detail: 'The child has no target.',
    });
  });

  it('carries the moment the walk settled rather than a moment of its own', () => {
    expect(failedOutcome(noteOf({ because: 'refused', status: 500 }), 99)).toMatchObject({
      at: 99,
    });
  });
});

describe('which children the gateway still owes a row for', () => {
  it('owes nothing for a child a provider refused, because that attempt raised its own row', () => {
    expect(nothingAnsweredFor(noteOf({ because: 'refused', status: 429 }))).toBe(false);
  });

  it('owes nothing for a child that failed mid-stream, because a provider answered it', () => {
    expect(nothingAnsweredFor(noteOf({ because: 'stream-error', status: 503 }))).toBe(false);
  });

  it('owes a row for a child nothing could be reached at', () => {
    expect(nothingAnsweredFor(noteOf({ because: 'transport-failure' }))).toBe(true);
  });

  it('owes a row for a child holding no credential, because no provider was asked', () => {
    expect(nothingAnsweredFor(noteOf({ because: 'missing-credential' }))).toBe(true);
  });

  it('owes a row for a child whose account left the registry', () => {
    expect(nothingAnsweredFor(noteOf({ because: 'missing-target' }))).toBe(true);
  });
});
