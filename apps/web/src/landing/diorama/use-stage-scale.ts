import type { RefObject } from 'react';

import { useLayoutEffect, useState } from 'react';

export function useStageScale(frameRef: RefObject<HTMLDivElement | null>, baseWidth: number) {
  const [stageScale, setStageScale] = useState(1);

  useLayoutEffect(() => {
    const update = () => {
      const frame = frameRef.current;

      if (frame) setStageScale(frame.clientWidth / baseWidth);
    };

    update();
    const observer = new ResizeObserver(update);
    const frame = frameRef.current;

    if (frame) observer.observe(frame);

    return () => {
      observer.disconnect();
    };
  }, [frameRef, baseWidth]);

  return stageScale;
}
