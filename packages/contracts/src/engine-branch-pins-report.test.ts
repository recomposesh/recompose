import { describe, expect, test } from 'vitest';

import { engineBranchPinReportSchema } from './engine-branch-pins';
import { engineReportSchema } from './engine-protocol';

const counted = {
  kind: 'branch-pins',
  slug: 'personal',
  virtualModel: 'fast',
  routeNode: 'ladder',
  pinned: { coder: 3, talker: 1 },
};

describe('what the child tells the parent about the branches one router holds', () => {
  test('a tally names its gateway, its virtual model, and the router counting', () => {
    expect(engineBranchPinReportSchema.parse(counted)).toEqual(counted);
  });

  test('a router that just let its last conversation go counts nothing', () => {
    const emptied = { ...counted, pinned: {} };

    expect(engineBranchPinReportSchema.parse(emptied)).toEqual(emptied);
  });

  test('a tally answering a directive is refused, because nothing asked for it', () => {
    expect(() =>
      engineBranchPinReportSchema.parse({ ...counted, answers: 'directive-1' }),
    ).toThrow();
  });

  test('a tally carrying the conversation behind a count is refused, so no fingerprint crosses', () => {
    expect(() =>
      engineBranchPinReportSchema.parse({ ...counted, fingerprint: 'e3b0c442' }),
    ).toThrow();
  });

  test('a tally carrying what was asked is refused, so no prompt can cross', () => {
    expect(() => engineBranchPinReportSchema.parse({ ...counted, prompt: 'hello' })).toThrow();
  });

  test('a tally names its virtual model by the alias a client sends, dots and all', () => {
    const dotted = { ...counted, virtualModel: 'claude-5.6-sol' };

    expect(engineBranchPinReportSchema.parse(dotted)).toEqual(dotted);
  });

  test('a tally naming no router is refused, because no ladder would own the counts', () => {
    const { routeNode, ...withoutTheRouter } = counted;

    expect(routeNode).toBe('ladder');
    expect(() => engineBranchPinReportSchema.parse(withoutTheRouter)).toThrow();
  });

  test('the tally rides beside the answers, so no directive report reads as a tally', () => {
    expect(() => engineReportSchema.parse(counted)).toThrow();
  });
});
