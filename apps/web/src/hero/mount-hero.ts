import {
  createPlateTexture,
  createPrograms,
  createTarget,
  destroyTarget,
  trailSize,
} from './hero-gl';
import { type HeroMotion, heroMotionStep, restingMotion } from './hero-motion';
import { type Frame, paintComposite, paintTrail } from './hero-paint';
import { type HeroSources, createPlateSource } from './hero-plate-source';

export type { HeroSources };

const MAX_PIXEL_RATIO = 1.75;
const REVEAL_EASE = 0.12;
const SPOT_RADIUS = 260;
const INK_LAG = 0.05;
const INK_STEP = 0.4;

function watchVisibility(canvas: HTMLCanvasElement) {
  let onScreen = false;

  const observer = new IntersectionObserver(
    (entries) => {
      onScreen = entries[0]?.isIntersecting ?? false;
    },
    { threshold: 0 },
  );

  observer.observe(canvas);

  return {
    showing: () => onScreen,
    dispose: () => {
      observer.disconnect();
    },
  };
}

function watchScheme() {
  const isLight = () => !document.documentElement.classList.contains('dark');

  let light = isLight();

  const observer = new MutationObserver(() => {
    light = isLight();
  });

  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  return {
    light: () => light,
    dispose: () => {
      observer.disconnect();
    },
  };
}

function watchPointer() {
  let pointer: { x: number; y: number } | null = null;

  const onPointerMove = (event: PointerEvent) => {
    pointer = { x: event.clientX, y: event.clientY };
  };

  addEventListener('pointermove', onPointerMove);

  return {
    read: () => pointer,
    dispose: () => {
      removeEventListener('pointermove', onPointerMove);
    },
  };
}

function createSurface(gl: WebGLRenderingContext, canvas: HTMLCanvasElement, pixelRatio: number) {
  let width = 0;
  let height = 0;
  let front = createTarget(gl, 2, 2);
  let back = createTarget(gl, 2, 2);

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(box.width * pixelRatio));
    const nextHeight = Math.max(1, Math.round(box.height * pixelRatio));

    if (nextWidth === width && nextHeight === height) return;

    width = nextWidth;
    height = nextHeight;
    canvas.width = width;
    canvas.height = height;
    destroyTarget(gl, front);
    destroyTarget(gl, back);
    front = createTarget(gl, trailSize(width), trailSize(height));
    back = createTarget(gl, front.width, front.height);
  };

  const boxWatcher = new ResizeObserver(resize);

  resize();
  boxWatcher.observe(canvas);

  return {
    size: () => ({ width, height }),
    pair: () => ({ from: front, into: back }),
    swap: () => {
      const spent = front;

      front = back;
      back = spent;
    },
    dispose: () => {
      boxWatcher.disconnect();
      destroyTarget(gl, front);
      destroyTarget(gl, back);
    },
  };
}

type Stage = {
  gl: WebGLRenderingContext;
  programs: ReturnType<typeof createPrograms>;
  plateTexture: ReturnType<typeof createPlateTexture>;
  plates: ReturnType<typeof createPlateSource>;
  surface: ReturnType<typeof createSurface>;
};

function paintStage(stage: Stage, motion: HeroMotion, frame: Frame, still: boolean) {
  const pair = stage.surface.pair();

  paintTrail(stage.gl, stage.programs.trail, pair, motion, frame);
  paintComposite(
    stage.gl,
    stage.programs.composite,
    { plate: stage.plateTexture, trail: pair.into },
    { plate: stage.plates.current(still), motion },
    frame,
  );
  stage.surface.swap();
}

type Head = { x: number; y: number };

function easeInk(ink: Head | null, head: Head): Head {
  if (!ink) return head;

  return { x: ink.x + (head.x - ink.x) * INK_LAG, y: ink.y + (head.y - ink.y) * INK_LAG };
}

function settled(ink: Head | null, next: Head) {
  return ink !== null && Math.hypot(next.x - ink.x, next.y - ink.y) < INK_STEP;
}

function litBySpot(mark: HTMLElement, box: DOMRect, ink: Head) {
  const left = `${ink.x - box.left - SPOT_RADIUS}px`;
  const top = `${ink.y - box.top - SPOT_RADIUS}px`;

  if (mark.dataset['spot'] === 'mask') {
    mark.style.maskPosition = `${left} ${top}`;

    return;
  }

  mark.style.setProperty('--spot-x', left);
  mark.style.setProperty('--spot-y', top);
}

function trackSpot(canvas: HTMLCanvasElement) {
  const marks = [...(canvas.parentElement?.querySelectorAll<HTMLElement>('[data-spot]') ?? [])];

  let boxes = marks.map((mark) => mark.getBoundingClientRect());
  let ink: Head | null = null;

  const paint = (at: Head) => {
    for (const [index, mark] of marks.entries()) {
      const box = boxes[index];

      if (box) litBySpot(mark, box, at);
    }
  };

  const remeasure = () => {
    boxes = marks.map((mark) => mark.getBoundingClientRect());

    if (ink) paint(ink);
  };

  addEventListener('resize', remeasure);
  addEventListener('scroll', remeasure, { passive: true });

  return {
    move: (head: Head) => {
      const next = easeInk(ink, head);

      if (settled(ink, next)) return;

      ink = next;

      paint(ink);
    },
    dispose: () => {
      removeEventListener('resize', remeasure);
      removeEventListener('scroll', remeasure);
    },
  };
}

function holdPlate(gl: WebGLRenderingContext) {
  const texture = createPlateTexture(gl);

  return {
    texture,
    dispose: () => {
      gl.deleteTexture(texture);
    },
  };
}

function restingFrame(pixelRatio: number): Frame {
  return { width: 0, height: 0, pixelRatio, seconds: 0, reveal: 0, inverted: false };
}

export function mountHero(canvas: HTMLCanvasElement, sources: HeroSources): () => void {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });

  if (!gl) return () => undefined;

  const stillness = matchMedia('(prefers-reduced-motion: reduce)');
  const pixelRatio = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);
  const programs = createPrograms(gl);
  const plate = holdPlate(gl);
  const plates = createPlateSource(sources, stillness);
  const watchers = {
    visibility: watchVisibility(canvas),
    pointer: watchPointer(),
    scheme: watchScheme(),
  };

  const surface = createSurface(gl, canvas, pixelRatio);
  const spot = trackSpot(canvas);
  const stage: Stage = { gl, programs, plateTexture: plate.texture, plates, surface };
  const parts = [surface, plates, plate, spot, ...Object.values(watchers)];

  let frame = restingFrame(pixelRatio);
  let motion: HeroMotion = restingMotion({ width: innerWidth, height: innerHeight });
  let handle = 0;

  const startedAt = performance.now();

  const draw = (now: number) => {
    handle = requestAnimationFrame(draw);

    if (!watchers.visibility.showing()) return;

    const still = stillness.matches;

    frame = {
      ...frame,
      ...surface.size(),
      seconds: still ? 0 : (now - startedAt) / 1000,
      reveal: frame.reveal + (1 - frame.reveal) * REVEAL_EASE,
      inverted: watchers.scheme.light(),
    };

    motion = heroMotionStep(motion, {
      pointer: watchers.pointer.read(),
      elapsedSeconds: frame.seconds,
      stillness: still,
      viewport: { width: innerWidth, height: innerHeight },
    });

    spot.move(motion.head);
    paintStage(stage, motion, frame, still);
  };

  handle = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(handle);

    for (const part of parts) part.dispose();
  };
}
