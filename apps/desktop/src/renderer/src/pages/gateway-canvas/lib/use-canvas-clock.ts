import { useEffect, useState } from 'react';

const CANVAS_CLOCK_TICK_MS = 10_000;

/**
 * The instant the canvas derives its traffic tints against, moved along every ten seconds.
 *
 * @summary Traffic pushes repaint the canvas the moment they land, but nothing repaints it when
 * the traffic goes quiet, and a quiet canvas is exactly when a warm cable has to cool back down.
 * Ten seconds is coarse on purpose: the tint remembers a whole minute, so nobody can see the lag,
 * and the flow re-derives eighteen times a minute less than a per-second clock would ask.
 */
export function useCanvasClock(): number {
  const [instant, setInstant] = useState(() => Date.now());

  useEffect(() => {
    const beat = setInterval(() => {
      setInstant(Date.now());
    }, CANVAS_CLOCK_TICK_MS);

    return () => {
      clearInterval(beat);
    };
  }, []);

  return instant;
}
