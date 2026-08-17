import { useRef } from 'react';

import { Desktop } from './desktop';
import { NarrationLine } from './narration-line';
import { useDioramaAnimation } from './use-diorama-animation';
import { useStageScale } from './use-stage-scale';

const NARRATION_BRIGHT = 'claude code asks for fast.';
const NARRATION_DIM = 'fast is whichever model you wired behind it.';

export function DioramaSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const windowLayerRef = useRef<HTMLDivElement>(null);

  useStageScale(frameRef, windowLayerRef);
  useDioramaAnimation(sectionRef);

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ marginTop: '-24svh', height: '340svh' }}
    >
      <div data-diorama-viewport className="relative h-svh overflow-hidden">
        <div
          ref={frameRef}
          data-diorama-stage
          className="absolute overflow-hidden shadow-2xl"
          style={{
            insetInlineStart: '50%',
            top: '50%',
            translate: '-50% -50%',
            width: 'min(100vw - 8rem, 1312px)',
            aspectRatio: '1312 / 820',
            borderRadius: 16,
          }}
        >
          <Desktop windowLayerRef={windowLayerRef} />
          <div className="absolute font-sans" style={{ insetInlineStart: '5%', bottom: '16%' }}>
            <p
              className="font-medium"
              style={{ fontSize: 'clamp(24px, 3.2vw, 46px)', lineHeight: 1.05 }}
            >
              <NarrationLine text={NARRATION_BRIGHT} tone="text-stage-bright" />
              <NarrationLine text={NARRATION_DIM} tone="text-stage-faint" />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
