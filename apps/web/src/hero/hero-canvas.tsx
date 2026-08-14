import { useEffect, useRef } from 'react';

import { mountHero } from './mount-hero';

const SOURCES = { poster: '/orchestra-poster.jpg', loop: '/orchestra-loop.mp4' };

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return undefined;

    return mountHero(canvas, SOURCES);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />;
}
