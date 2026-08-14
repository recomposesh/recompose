type Point = { x: number; y: number };

export type Viewport = { width: number; height: number };

export type HeroMotion = {
  head: Point;
  previousHead: Point;
  aims: readonly [Point, Point, Point];
  trailDecay: number;
  loopPlays: boolean;
};

export type HeroMotionInput = {
  pointer: Point | null;
  elapsedSeconds: number;
  stillness: boolean;
  viewport: Viewport;
};

const HEAD_LAG = 0.14;
const FOLLOW_LAG = 0.065;
const MAX_LEAD = 340;
const MOVING_DECAY = 0.972;
const STILL_DECAY = 0.9;

const SPOTLIGHTS = [
  { lag: 1, lead: 26, wobbleSpeed: 0.7, phase: 0, wobbleAmplitude: 26 },
  { lag: 0.65, lead: 4, wobbleSpeed: 0.53, phase: 2.1, wobbleAmplitude: 34 },
  { lag: 1.35, lead: -18, wobbleSpeed: 0.61, phase: 4.2, wobbleAmplitude: 26 },
] as const;

export function restingMotion(viewport: Viewport): HeroMotion {
  const centre = { x: viewport.width * 0.5, y: viewport.height * 0.42 };

  return {
    head: centre,
    previousHead: centre,
    aims: [centre, centre, centre],
    trailDecay: MOVING_DECAY,
    loopPlays: true,
  };
}

function wanderTarget(elapsedSeconds: number, viewport: Viewport): Point {
  return {
    x: viewport.width * (0.5 + 0.32 * Math.sin(elapsedSeconds * 0.21)),
    y: viewport.height * (0.45 + 0.22 * Math.cos(elapsedSeconds * 0.17)),
  };
}

function clampLead(lead: Point): Point {
  const reach = Math.hypot(lead.x, lead.y);

  if (reach <= MAX_LEAD) return lead;

  return { x: (lead.x * MAX_LEAD) / reach, y: (lead.y * MAX_LEAD) / reach };
}

function nextAim(
  spotlight: (typeof SPOTLIGHTS)[number],
  settled: Point,
  head: Point,
  velocity: Point,
  input: HeroMotionInput,
): Point {
  const lead = clampLead({ x: velocity.x * spotlight.lead, y: velocity.y * spotlight.lead });
  const wobble = input.stillness
    ? { x: 0, y: 0 }
    : {
        x:
          Math.sin(input.elapsedSeconds * spotlight.wobbleSpeed + spotlight.phase) *
          spotlight.wobbleAmplitude,
        y:
          Math.cos(input.elapsedSeconds * spotlight.wobbleSpeed * 0.8 + spotlight.phase) *
          spotlight.wobbleAmplitude *
          0.5,
      };
  const ease = FOLLOW_LAG * spotlight.lag;

  return {
    x: settled.x + (head.x + lead.x + wobble.x - settled.x) * ease,
    y: settled.y + (head.y + lead.y + wobble.y - settled.y) * ease,
  };
}

export function heroMotionStep(previous: HeroMotion, input: HeroMotionInput): HeroMotion {
  const target = input.pointer ?? wanderTarget(input.elapsedSeconds, input.viewport);

  const head = {
    x: previous.head.x + (target.x - previous.head.x) * HEAD_LAG,
    y: previous.head.y + (target.y - previous.head.y) * HEAD_LAG,
  };

  const velocity = { x: head.x - previous.head.x, y: head.y - previous.head.y };

  const [first, second, third] = previous.aims;

  return {
    head,
    previousHead: previous.head,
    aims: [
      nextAim(SPOTLIGHTS[0], first, head, velocity, input),
      nextAim(SPOTLIGHTS[1], second, head, velocity, input),
      nextAim(SPOTLIGHTS[2], third, head, velocity, input),
    ],
    trailDecay: input.stillness ? STILL_DECAY : MOVING_DECAY,
    loopPlays: !input.stillness,
  };
}
