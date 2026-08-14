import { chooseLoopAction, choosePlate } from './hero-plate';

export type Plate = HTMLImageElement | HTMLVideoElement;

export type HeroSources = { poster: string; loop: string };

export function plateReady(plate: Plate) {
  return plate instanceof HTMLVideoElement ? plate.readyState >= 2 : plate.complete;
}

export function plateAspect(plate: Plate) {
  const width = plate instanceof HTMLVideoElement ? plate.videoWidth : plate.naturalWidth;
  const height = plate instanceof HTMLVideoElement ? plate.videoHeight : plate.naturalHeight;

  return height === 0 ? 1 : width / height;
}

function createPoster(src: string) {
  const poster = new Image();

  poster.fetchPriority = 'high';
  poster.src = src;

  return poster;
}

function createLoop() {
  const loop = document.createElement('video');

  loop.muted = true;
  loop.loop = true;
  loop.playsInline = true;
  loop.preload = 'auto';

  return loop;
}

export function createPlateSource(sources: HeroSources, stillness: MediaQueryList) {
  const poster = createPoster(sources.poster);
  const loop = createLoop();

  let loopReady = false;
  let playbackRefused = false;

  const playLoop = () => {
    loop.play().catch(() => {
      playbackRefused = true;
    });
  };

  const onLoopReady = () => {
    loopReady = true;

    playLoop();
  };

  loop.addEventListener('loadeddata', onLoopReady);

  const startLoop = () => {
    const action = chooseLoopAction({
      stillness: stillness.matches,
      loopReady,
      sourceSet: loop.getAttribute('src') !== null,
    });

    if (action === 'fetch') loop.src = sources.loop;
    if (action === 'play') playLoop();
  };

  if (poster.complete) startLoop();
  else poster.addEventListener('load', startLoop, { once: true });

  poster.addEventListener('error', startLoop, { once: true });

  const onStillnessChange = () => {
    if (stillness.matches) {
      loop.pause();

      return;
    }

    startLoop();
  };

  stillness.addEventListener('change', onStillnessChange);

  return {
    current: (still: boolean): Plate =>
      choosePlate({ stillness: still, loopReady, playbackRefused }) === 'loop' ? loop : poster,
    dispose: () => {
      loop.removeEventListener('loadeddata', onLoopReady);
      stillness.removeEventListener('change', onStillnessChange);
      loop.pause();
      loop.removeAttribute('src');
      loop.load();
    },
  };
}
