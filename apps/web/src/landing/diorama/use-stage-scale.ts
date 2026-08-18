import type { RefObject } from 'react';

import { useLayoutEffect } from 'react';

const DESIGN_WIDTH = 1312;
const DESIGN_HEIGHT = 820;

export function useStageScale(
  frameRef: RefObject<HTMLDivElement | null>,
  windowLayerRef: RefObject<HTMLDivElement | null>,
) {
  useLayoutEffect(() => {
    const frame = frameRef.current;
    const observer = new ResizeObserver(() => {
      const layer = windowLayerRef.current;

      if (!frame || !layer) return;
      const scale = Math.min(frame.clientWidth / DESIGN_WIDTH, frame.clientHeight / DESIGN_HEIGHT);

      layer.style.scale = String(scale);
    });

    if (frame) observer.observe(frame);

    return () => {
      observer.disconnect();
    };
  }, [frameRef, windowLayerRef]);
}
