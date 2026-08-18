import { useRef } from 'react';

import { Desktop } from './desktop';
import { NarrationBlock } from './narration-block';
import { HERO_OVERLAP_SVH, useDioramaAnimation } from './use-diorama-animation';
import { useStageScale } from './use-stage-scale';

const NARRATION_CLAUDE_BRIGHT = 'claude code asks for fast.';
const NARRATION_CLAUDE_DIM = 'fast is whichever model you wired behind it.';
const NARRATION_CODEX_BRIGHT = 'codex asks for smart.';
const NARRATION_CODEX_DIM = 'same url, a different model answers.';

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
      style={{ marginTop: `-${HERO_OVERLAP_SVH}svh`, height: '420svh' }}
    >
      <div data-diorama-viewport className="relative h-svh">
        <div
          ref={frameRef}
          data-diorama-stage
          className="absolute overflow-hidden"
          style={{
            insetInlineStart: '50%',
            top: '50%',
            translate: '-50% -50%',
            width: 'min(100vw - 8rem, 1312px)',
            aspectRatio: '1312 / 820',
            borderRadius: 24,
            boxShadow: '0 32px 80px rgb(0 0 0 / 0.22)',
          }}
        >
          <Desktop windowLayerRef={windowLayerRef} />
          <div
            data-narration
            className="absolute font-sans"
            style={{ insetInlineStart: '5%', bottom: '16%' }}
          >
            <NarrationBlock
              act="claude"
              bright={NARRATION_CLAUDE_BRIGHT}
              dim={NARRATION_CLAUDE_DIM}
            />
            <NarrationBlock
              act="codex"
              bright={NARRATION_CODEX_BRIGHT}
              dim={NARRATION_CODEX_DIM}
              className="absolute inset-s-0 top-0 w-max"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
