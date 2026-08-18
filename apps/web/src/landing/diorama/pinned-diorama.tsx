import type { Ref } from 'react';

import { Desktop } from './desktop';
import { NarrationBlock } from './narration-block';
import {
  NARRATION_CLAUDE_BRIGHT,
  NARRATION_CLAUDE_DIM,
  NARRATION_CODEX_BRIGHT,
  NARRATION_CODEX_DIM,
} from './narration-copy';

export function PinnedDiorama({
  frameRef,
  windowLayerRef,
}: {
  frameRef: Ref<HTMLDivElement>;
  windowLayerRef: Ref<HTMLDivElement>;
}) {
  return (
    <div
      className="hidden md:block"
      style={{ marginTop: 'calc(-1 * var(--diorama-overlap))', height: '420svh' }}
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
            width: 'min(100vw - var(--diorama-gutter), 1312px)',
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
    </div>
  );
}
