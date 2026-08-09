import { describe, expect, it } from 'vitest';

import type { BindingOutcome } from './cable-announcements';

import { announcedOutcome, announcedUrgency } from './cable-announcements';

const everyOutcome: readonly BindingOutcome[] = [
  { kind: 'bound', virtualModel: 'fast', target: 'work key' },
  { kind: 'rebound', virtualModel: 'fast', target: 'personal key' },
  { kind: 'released', virtualModel: 'fast' },
  { kind: 'repaired', virtualModel: 'fast', target: 'work key' },
  { kind: 'refused', refusal: 'recompose cannot store this virtual model as it stands.' },
];

describe('what the live region says about a binding', () => {
  it('names both ends of a binding a person just made', () => {
    expect(announcedOutcome({ kind: 'bound', virtualModel: 'fast', target: 'work key' })).toBe(
      'Bound the virtual model "fast" to "work key".',
    );
  });

  it('names where a rebound virtual model reaches now', () => {
    expect(
      announcedOutcome({ kind: 'rebound', virtualModel: 'fast', target: 'personal key' }),
    ).toBe('Rebound the virtual model "fast" to "personal key".');
  });

  it('says an unbound virtual model is left holding no target', () => {
    expect(announcedOutcome({ kind: 'released', virtualModel: 'fast' })).toBe(
      'Unbound the virtual model "fast", which now holds no target.',
    );
  });

  it('says a binding whose account had left stands again', () => {
    expect(announcedOutcome({ kind: 'repaired', virtualModel: 'fast', target: 'work key' })).toBe(
      'Repaired the virtual model "fast", which is bound to "work key" again.',
    );
  });

  it('carries a refusal in the words the refusal itself used', () => {
    expect(
      announcedOutcome({ kind: 'refused', refusal: 'A gateway binds to a virtual model.' }),
    ).toBe('Refused the binding. A gateway binds to a virtual model.');
  });

  it('speaks of a virtual model rather than a bare model, whatever happened', () => {
    for (const outcome of everyOutcome) {
      expect(announcedOutcome(outcome)).not.toMatch(/(?<!virtual )model/u);
    }
  });

  it('ends every announcement as a sentence, so a reader hears where it stops', () => {
    for (const outcome of everyOutcome) {
      expect(announcedOutcome(outcome).endsWith('.')).toBe(true);
    }
  });
});

describe('how loudly the live region speaks', () => {
  it('interrupts for a refusal, because it changes what the gesture in hand will do', () => {
    expect(announcedUrgency({ kind: 'refused', refusal: 'Nothing can serve that.' })).toBe(
      'assertive',
    );
  });

  it('waits its turn for every outcome a person already asked for', () => {
    const routine = everyOutcome.filter((outcome) => outcome.kind !== 'refused');

    expect(routine.map(announcedUrgency)).toEqual(['polite', 'polite', 'polite', 'polite']);
  });
});
