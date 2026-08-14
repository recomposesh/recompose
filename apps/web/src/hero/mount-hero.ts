import { createPlateTexture, createPrograms, createTarget } from './hero-gl';
import { type HeroMotion, heroMotionStep, restingMotion } from './hero-motion';
import { type Frame, paintComposite, paintTrail } from './hero-paint';
import { type HeroSources, createPlateSource } from './hero-plate-source';

export type { HeroSources };

const MAX_PIXEL_RATIO = 1.75;
const TRAIL_SCALE = 4;
const REVEAL_EASE = 0.12;

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
    front = createTarget(gl, Math.max(2, width / TRAIL_SCALE), Math.max(2, height / TRAIL_SCALE));
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
    },
  };
}

export function mountHero(canvas: HTMLCanvasElement, sources: HeroSources): () => void {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });

  if (!gl) return () => undefined;

  const stillness = matchMedia('(prefers-reduced-motion: reduce)');
  const pixelRatio = Math.min(devicePixelRatio || 1, MAX_PIXEL_RATIO);
  const programs = createPrograms(gl);
  const plateTexture = createPlateTexture(gl);
  const plates = createPlateSource(sources, stillness);
  const visibility = watchVisibility(canvas);
  const pointer = watchPointer();

  const surface = createSurface(gl, canvas, pixelRatio);
  const parts = [surface, pointer, visibility, plates];

  let frame: Frame = { width: 0, height: 0, pixelRatio, seconds: 0, reveal: 0 };
  let motion: HeroMotion = restingMotion({ width: innerWidth, height: innerHeight });
  let handle = 0;

  const startedAt = performance.now();

  const draw = (now: number) => {
    handle = requestAnimationFrame(draw);

    if (!visibility.showing()) return;

    const still = stillness.matches;

    frame = {
      ...frame,
      ...surface.size(),
      seconds: still ? 0 : (now - startedAt) / 1000,
      reveal: frame.reveal + (1 - frame.reveal) * REVEAL_EASE,
    };

    motion = heroMotionStep(motion, {
      pointer: pointer.read(),
      elapsedSeconds: frame.seconds,
      stillness: still,
      viewport: { width: innerWidth, height: innerHeight },
    });

    const pair = surface.pair();

    paintTrail(gl, programs.trail, pair, motion, frame);
    paintComposite(
      gl,
      programs.composite,
      { plate: plateTexture, trail: pair.into },
      { plate: plates.current(still), motion },
      frame,
    );
    surface.swap();
  };

  handle = requestAnimationFrame(draw);

  return () => {
    cancelAnimationFrame(handle);

    for (const part of parts) part.dispose();
  };
}
