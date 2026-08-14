import { choosePlate } from './hero-plate';

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

export function createPlateSource(sources: HeroSources, stillness: MediaQueryList) {
  const poster = new Image();

  poster.src = sources.poster;

  const loop = document.createElement('video');

  loop.muted = true;
  loop.loop = true;
  loop.playsInline = true;
  loop.preload = 'auto';

  let loopReady = false;
  let playbackRefused = false;

  const onLoopReady = () => {
    loopReady = true;

    loop.play().catch(() => {
      playbackRefused = true;
    });
  };

  loop.addEventListener('loadeddata', onLoopReady);

  if (!stillness.matches) loop.src = sources.loop;

  const onStillnessChange = () => {
    if (stillness.matches) {
      loop.pause();

      return;
    }

    if (loop.getAttribute('src') === null) loop.src = sources.loop;
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
