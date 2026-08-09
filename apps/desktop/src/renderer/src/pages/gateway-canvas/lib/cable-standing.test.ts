import { describe, expect, it } from 'vitest';

import type { CableStanding } from './node-graph';

import {
  CABLE_GRAB_SPAN,
  strokeForRelease,
  strokeForStanding,
  tintForStanding,
} from './cable-standing';

const everyStanding: readonly CableStanding[] = ['resting', 'live', 'broken', 'draft', 'pending'];

describe('what a cable paints for its standing', () => {
  it('gives each standing its own stroke', () => {
    expect(everyStanding.map(strokeForStanding)).toEqual([
      'stroke-cable-resting',
      'stroke-cable-live',
      'stroke-cable-broken',
      'stroke-cable-draft',
      'stroke-cable-pending',
    ]);
  });

  it('gives each standing its own tint for the furniture at the cable ends', () => {
    expect(everyStanding.map(tintForStanding)).toEqual([
      'node-tint-cable-resting',
      'node-tint-cable-live',
      'node-tint-cable-broken',
      'node-tint-cable-draft',
      'node-tint-cable-pending',
    ]);
  });

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
