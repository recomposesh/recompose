import { describe, expect, it } from 'vitest';

import type { CableStanding } from './node-graph';

import {
  branchIn,
  CABLE_GRAB_SPAN,
  failureIn,
  pointAlongCable,
  pulseForStanding,
  RULE_PILL_ANCHOR,
  RULE_PILL_CHARACTERS,
  ruleShown,
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

  it('travels a pulse along the live cable alone, which is the request still in flight', () => {
    expect(everyStanding.filter((standing) => pulseForStanding(standing) !== '')).toEqual(['live']);
    expect(pulseForStanding('live')).toBe('cable-pulse');
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

describe('where furniture rides along a cable', () => {
  const bowed = 'M0,0 C60,0 140,100 200,100';

  it('leaves the midpoint free, so the rule pill and the failure chip never stack', () => {
    expect(RULE_PILL_ANCHOR).toBeGreaterThan(0);
    expect(RULE_PILL_ANCHOR).toBeLessThan(0.5);
  });

  it('reads a point off the curve itself rather than off the line between the two ends', () => {
    const rode = pointAlongCable(bowed, 0.5);

    expect(rode).toEqual({ x: 100, y: 50 });
  });

  it('rides earlier along the cable than the midpoint the failure chip holds', () => {
    const early = pointAlongCable(bowed, RULE_PILL_ANCHOR);

    expect(early?.x).toBeLessThan(100);
    expect(early?.y).toBeLessThan(50);
  });

  it('reads nothing off a path this canvas never drew as one curve', () => {
    expect(pointAlongCable('M0,0 L200,100', 0.35)).toBeUndefined();
    expect(pointAlongCable('', 0.35)).toBeUndefined();
  });
});

describe('the rule a pill prints on the cable it rides', () => {
  it('keeps a rule the clear span between two columns can hold', () => {
    expect(ruleShown('Code review')).toBe('Code review');
  });

  it('cuts a rule longer than that span, so the pill never covers the cards it runs between', () => {
    const long = 'The request asks for a review of code the caller pasted in';
    const shown = ruleShown(long);

    expect(shown.length).toBeLessThanOrEqual(RULE_PILL_CHARACTERS);
    expect(shown.endsWith('…')).toBe(true);
    expect(long.startsWith(shown.slice(0, -1))).toBe(true);
  });

  it('caps at a count the span between one card and the next affords', () => {
    expect(RULE_PILL_CHARACTERS).toBeGreaterThan(10);
    expect(RULE_PILL_CHARACTERS).toBeLessThan(30);
  });
});

describe('the branch a cable carries', () => {
  it('hands over the label and the rule the judge reads this cable by', () => {
    expect(branchIn({ kind: 'rule', label: 'code', rule: 'It writes code.' })).toEqual({
      kind: 'rule',
      label: 'code',
      rule: 'It writes code.',
    });
  });

  it('hands over the fallback seat, which carries no rule anybody wrote', () => {
    expect(branchIn({ kind: 'else' })).toEqual({ kind: 'else' });
  });

  it('reads no branch off a cable carrying none, which is every unjudged binding', () => {
    expect(branchIn(undefined)).toBeUndefined();
    expect(branchIn('code')).toBeUndefined();
    expect(branchIn({ kind: 'rotation' })).toBeUndefined();
  });

  it('refuses half a branch, so no pill stands offering a rule it cannot finish saying', () => {
    expect(branchIn({ kind: 'rule', label: 'code' })).toBeUndefined();
    expect(branchIn({ kind: 'rule', rule: 'It writes code.' })).toBeUndefined();
    expect(branchIn({ kind: 'rule', label: 7, rule: 'It writes code.' })).toBeUndefined();
  });
});

describe('the pointer target a cable end offers', () => {
  it('meets the minimum a pointer target may be', () => {
    expect(CABLE_GRAB_SPAN).toBeGreaterThanOrEqual(24);
  });
});
