import { useEffect, useRef } from 'react';

import { stageHero } from './hero-stage';

const SOURCES = { poster: '/orchestra-poster.jpg', loop: '/orchestra-loop.mp4' };
const STAGE_FADE =
  'linear-gradient(to bottom, black calc(100% - var(--diorama-overlap)), transparent)';

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return undefined;

    return stageHero(canvas, SOURCES);
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-0">
      <img
        src={SOURCES.poster}
        alt=""
        className="absolute inset-0 size-full object-cover md:hidden"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        style={{ maskImage: STAGE_FADE }}
      />
    </div>
  );
}
