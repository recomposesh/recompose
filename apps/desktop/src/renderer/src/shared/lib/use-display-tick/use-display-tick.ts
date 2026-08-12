import { useEffect, useState } from 'react';

/**
 * The instant a live reading derives against, moved along on the caller's own cadence.
 *
 * @summary Rows and pushes arrive on the transport's cadence, which is faster than anybody reads,
 * and a quiet surface receives nothing at all. A display clock settles both: a busy surface
 * repaints on the beat rather than per frame, and a quiet one still decays to zeros. The caller
 * names the beat, because a footer somebody watches wants a second while a canvas tint wants ten.
 */
export function useDisplayTick(intervalMs: number): number {
  const [instant, setInstant] = useState(() => Date.now());

  useEffect(() => {
    const beat = setInterval(() => {
      setInstant(Date.now());
    }, intervalMs);

    return () => {
      clearInterval(beat);
    };
  }, [intervalMs]);

  return instant;
}
