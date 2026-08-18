import { useRef } from 'react';

import { MobileDiorama } from './mobile-diorama';
import { PinnedDiorama } from './pinned-diorama';
import { useDioramaAnimation } from './use-diorama-animation';
import { useStageScale } from './use-stage-scale';

export function DioramaSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const windowLayerRef = useRef<HTMLDivElement>(null);

  useStageScale(frameRef, windowLayerRef);
  useDioramaAnimation(sectionRef);

  return (
    <section ref={sectionRef} className="relative">
      <MobileDiorama />
      <PinnedDiorama frameRef={frameRef} windowLayerRef={windowLayerRef} />
    </section>
  );
}
