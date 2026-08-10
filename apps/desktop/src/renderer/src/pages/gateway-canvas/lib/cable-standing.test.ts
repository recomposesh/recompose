import { describe, expect, it } from 'vitest';

import type { CableStanding } from './node-graph';

import {
  CABLE_GRAB_SPAN,
  failureIn,
  marchForStanding,
  pulseForStanding,
  strokeForRelease,
  strokeForStanding,
  tintForStanding,
} from './cable-standing';

const everyStanding: readonly CableStanding[] = [
  'resting',
  'live',
  'served',
  'failed',
  'broken',
  'draft',
  'pending',
];

describe('what a cable paints for its standing', () => {
  it('gives each standing its own stroke', () => {
    expect(everyStanding.map(strokeForStanding)).toEqual([
      'stroke-cable-resting',
      'stroke-cable-live',
      'stroke-cable-served',
      'stroke-cable-failed',
      'stroke-cable-broken',
      'stroke-cable-draft',
      'stroke-cable-pending',
    ]);
  });

  it('gives each standing its own tint for the furniture at the cable ends', () => {
    expect(everyStanding.map(tintForStanding)).toEqual([
      'node-tint-cable-resting',
      'node-tint-cable-live',
      'node-tint-cable-served',
      'node-tint-cable-failed',
      'node-tint-cable-broken',
      'node-tint-cable-draft',
      'node-tint-cable-pending',
    ]);
  });

  it('breaks the line into a march for the failure alone, because a broken line reads broken', () => {
    expect(everyStanding.filter((standing) => marchForStanding(standing) !== '')).toEqual([
      'failed',
    ]);
    expect(marchForStanding('failed')).toBe('cable-march');
  });

  it('travels a pulse along the served cable, which keeps its line whole while it flows', () => {
    expect(everyStanding.filter((standing) => pulseForStanding(standing) !== '')).toEqual([
      'served',
    ]);
    expect(pulseForStanding('served')).toBe('cable-pulse');
    expect(marchForStanding('served')).toBe('');
  });

  it('mutes a structural wire down to the resting treatment, so the frame never outshines a binding', () => {
    const structural: CableStanding = 'structural';

    expect(strokeForStanding(structural)).toBe('stroke-cable-resting');
    expect(tintForStanding(structural)).toBe('node-tint-cable-resting');
  });
});

describe('what a cable paints for a standing this canvas never named', () => {
  it('draws a cable carrying no standing at all, rather than leaving a binding invisible', () => {
    expect(strokeForStanding(undefined)).toBe('stroke-cable-resting');
    expect(tintForStanding(undefined)).toBe('node-tint-cable-resting');
  });

  it('draws a cable carrying a standing this canvas has no tint for', () => {
    expect(strokeForStanding('flowing')).toBe('stroke-cable-resting');
    expect(tintForStanding('flowing')).toBe('node-tint-cable-resting');
  });

  it('reads nothing into a standing that never was a word', () => {
    expect(strokeForStanding(7)).toBe('stroke-cable-resting');
    expect(strokeForStanding(null)).toBe('stroke-cable-resting');
    expect(tintForStanding({ standing: 'live' })).toBe('node-tint-cable-resting');
  });

  it('leaves a cable carrying no standing still, so nothing unexplained moves on the canvas', () => {
    expect(marchForStanding(undefined)).toBe('');
    expect(marchForStanding('flowing')).toBe('');
    expect(pulseForStanding(undefined)).toBe('');
    expect(pulseForStanding('flowing')).toBe('');
  });
});

describe('the failure a cable carries', () => {
  it('hands over the status and the sentence a failed binding answered with', () => {
    expect(failureIn({ status: 502, detail: 'The gateway could not reach the target.' })).toEqual({
      status: 502,
      detail: 'The gateway could not reach the target.',
    });
  });

  it('reads no failure off a cable carrying none, which is every cable that never failed', () => {
    expect(failureIn(undefined)).toBeUndefined();
    expect(failureIn(null)).toBeUndefined();
    expect(failureIn('502')).toBeUndefined();
  });

  it('refuses half a failure, so no chip stands offering an error it cannot finish saying', () => {
    expect(failureIn({ status: 502 })).toBeUndefined();
    expect(failureIn({ detail: 'It fell over.' })).toBeUndefined();
    expect(failureIn({ status: '502', detail: 'It fell over.' })).toBeUndefined();
  });
});

describe('what a cable in flight paints for the release under the pointer', () => {
  it('reads live over a port that would take it', () => {
    expect(strokeForRelease('valid')).toBe('stroke-cable-live');
  });

  it('reads broken over a port that would refuse it', () => {
    expect(strokeForRelease('invalid')).toBe('stroke-cable-broken');
  });

  it('reads pending over open canvas, where the release opens the picker instead', () => {
    expect(strokeForRelease(null)).toBe('stroke-cable-pending');
  });
});

describe('the pointer target a cable end offers', () => {
  it('meets the minimum a pointer target may be', () => {
    expect(CABLE_GRAB_SPAN).toBeGreaterThanOrEqual(24);
  });
});
