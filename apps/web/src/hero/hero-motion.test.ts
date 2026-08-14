import { describe, expect, it } from 'vitest';

import { type HeroMotionInput, heroMotionStep, restingMotion } from './hero-motion';

const viewport = { width: 1440, height: 900 };

const input = (overrides: Partial<HeroMotionInput> = {}): HeroMotionInput => ({
  pointer: { x: 1200, y: 200 },
  elapsedSeconds: 0,
  stillness: false,
  viewport,
  ...overrides,
});

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

describe('the hero reveal follows the pointer', () => {
  it('eases the head toward the pointer instead of jumping to it', () => {
    const resting = restingMotion(viewport);

    const next = heroMotionStep(resting, input());

    expect(distance(next.head, { x: 1200, y: 200 })).toBeGreaterThan(0);
    expect(distance(next.head, { x: 1200, y: 200 })).toBeLessThan(
      distance(resting.head, { x: 1200, y: 200 }),
    );
  });

  it('remembers where the head was, so the brush paints a segment rather than a dot', () => {
    const resting = restingMotion(viewport);

    const next = heroMotionStep(resting, input());

    expect(next.previousHead).toStrictEqual(resting.head);
    expect(next.previousHead).not.toStrictEqual(next.head);
  });

  it('gives each spotlight its own lag, so the three never stack on one point', () => {
    let motion = restingMotion(viewport);

    for (let step = 0; step < 20; step += 1) {
      motion = heroMotionStep(motion, input({ elapsedSeconds: step * 0.016 }));
    }

    const [first, second, third] = motion.aims;
    const spread = [
      distance(first, motion.head),
      distance(second, motion.head),
      distance(third, motion.head),
    ];

    expect(new Set(spread).size).toBe(3);
  });

  it('keeps a spotlight tethered to the head however fast the pointer crosses', () => {
    let motion = restingMotion(viewport);

    for (const x of [0, 1440, 0, 1440, 0]) {
      motion = heroMotionStep(motion, input({ pointer: { x, y: 450 } }));
    }

    for (const aim of motion.aims) {
      expect(distance(aim, motion.head)).toBeLessThanOrEqual(400);
    }
  });
});

describe('the hero answers a device with no pointer', () => {
  it('wanders the scene on its own so the visitor never meets a dark rectangle', () => {
    const resting = restingMotion(viewport);

    const early = heroMotionStep(resting, input({ pointer: null, elapsedSeconds: 0.5 }));
    const later = heroMotionStep(early, input({ pointer: null, elapsedSeconds: 3.5 }));

    expect(distance(early.head, later.head)).toBeGreaterThan(0);
  });

  it('keeps the wandering light inside the scene', () => {
    let motion = restingMotion(viewport);

    for (let step = 0; step < 400; step += 1) {
      motion = heroMotionStep(motion, input({ pointer: null, elapsedSeconds: step * 0.05 }));
      expect(motion.head.x).toBeGreaterThanOrEqual(0);
      expect(motion.head.x).toBeLessThanOrEqual(viewport.width);
      expect(motion.head.y).toBeGreaterThanOrEqual(0);
      expect(motion.head.y).toBeLessThanOrEqual(viewport.height);
    }
  });
});

describe('the hero yields to a reduced-motion preference', () => {
  it('stops the loop while the reveal keeps answering movement', () => {
    const resting = restingMotion(viewport);

    const next = heroMotionStep(resting, input({ stillness: true }));

    expect(next.loopPlays).toBe(false);
    expect(distance(next.head, resting.head)).toBeGreaterThan(0);
  });

  it('lets the light die back faster, so the scene settles rather than lingering', () => {
    const resting = restingMotion(viewport);

    const still = heroMotionStep(resting, input({ stillness: true }));
    const moving = heroMotionStep(resting, input({ stillness: false }));

    expect(still.trailDecay).toBeLessThan(moving.trailDecay);
  });

  it('plays the loop when nobody asked for stillness', () => {
    const resting = restingMotion(viewport);

    const next = heroMotionStep(resting, input());

    expect(next.loopPlays).toBe(true);
  });
});
