import { useRef } from 'react';

import { Desktop } from './desktop';
import { NarrationLine } from './narration-line';
import { useDioramaAnimation } from './use-diorama-animation';
import { useStageScale } from './use-stage-scale';

const DESKTOP_WIDTH = 1312;
const DESKTOP_HEIGHT = 820;
const NARRATION_BRIGHT = 'claude code asks for fast.';
const NARRATION_DIM = 'fast is whichever model you wired behind it.';

export function DioramaSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const stageScale = useStageScale(frameRef, DESKTOP_WIDTH);

  useDioramaAnimation(sectionRef, frameRef);

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ marginTop: '-24svh', height: '340svh' }}
    >
      <div data-diorama-viewport className="flex h-svh items-center overflow-hidden">
        <div className="mx-auto w-full max-w-360 px-16">
          <div
            ref={frameRef}
            data-diorama-stage
            className="relative mx-auto w-full"
            style={{
              aspectRatio: `${DESKTOP_WIDTH} / ${DESKTOP_HEIGHT}`,
              maxWidth: 'calc((100svh - 3rem) * 1.6)',
            }}
          >
            <div
              className="absolute inset-s-0 top-0 origin-top-left"
              style={{ scale: String(stageScale) }}
            >
              <Desktop />
            </div>
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
      </div>
    </section>
  );
}
