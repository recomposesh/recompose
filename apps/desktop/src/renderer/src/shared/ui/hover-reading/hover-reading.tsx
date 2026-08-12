import type { ReactNode } from 'react';

import { PreviewCard } from '@base-ui/react/preview-card';

type HoverReadingProps = {
  /** The mark the reading belongs to. */
  children: ReactNode;
  /** The printed reading that comes up beside the mark. */
  reading: ReactNode;
};

/**
 * A printed reading that comes up when a person rests on a mark or reaches it with the keyboard.
 *
 * @summary Reach for it on chart marks whose exact figures also live in a table twin: the hover
 * answers the quick look, the table stays the conformance path. The trigger is focusable, so the
 * reading opens without a pointer too.
 */
export function HoverReading({ children, reading }: HoverReadingProps) {
  return (
    <PreviewCard.Root>
      <PreviewCard.Trigger
        data-testid="hover-reading-trigger"
        render={<span className="inline-block focus-ring" />}
      >
        {children}
      </PreviewCard.Trigger>
      <PreviewCard.Portal>
        <PreviewCard.Positioner side="top" sideOffset={6}>
          <PreviewCard.Popup className="rounded-card border border-line-subtle bg-surface-card px-2.5 py-1.5 text-detail text-ink shadow-md">
            {reading}
          </PreviewCard.Popup>
        </PreviewCard.Positioner>
      </PreviewCard.Portal>
    </PreviewCard.Root>
  );
}
