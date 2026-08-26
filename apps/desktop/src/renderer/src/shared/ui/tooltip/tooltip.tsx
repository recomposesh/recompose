import type { ReactElement } from 'react';

import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip';
import { useId } from 'react';

/** Which way the reading comes up, for a control standing too near an edge to flip cleanly. */
type TooltipSide = 'bottom' | 'left' | 'right' | 'top';

type TooltipProps = {
  /** The control the reading belongs to, which the trigger renders in its own place. */
  children: ReactElement<Record<string, unknown>>;
  /** What the control does, in the words a person reads and assistive tech answers to. */
  label: string;
  /** A second sentence beyond the name, for a control whose name can't carry the whole story. */
  note?: string | undefined;
  /** Which side the reading comes up on. */
  side?: TooltipSide;
};

const surface =
  'rounded-control border border-line-strong bg-surface-raised px-2 py-1 text-detail text-ink shadow-raised transition-opacity duration-100 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0';

/**
 * The printed reading a control gives when a person rests on it or reaches it with the keyboard.
 *
 * @summary One string is both the control's accessible name and its printed reading, so a glyph
 * can never explain itself one way to a pointer and another to a screen reader. The reading itself
 * is hidden from assistive tech: it carries nothing the name has not already said, and this
 * project has shipped a doubled label before. Anything the name genuinely can't hold goes in
 * `note`, which reads as the control's description rather than as a second name.
 */
export function Tooltip({ children, label, note, side = 'bottom' }: TooltipProps) {
  const noteId = useId();
  const reading = note === undefined ? label : `${label}. ${note}`;

  return (
    <BaseTooltip.Root>
      <BaseTooltip.Trigger
        aria-describedby={note === undefined ? undefined : noteId}
        aria-label={label}
        render={children}
      />
      {note === undefined ? null : (
        <span className="sr-only" id={noteId}>
          {note}
        </span>
      )}
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={6}>
          <BaseTooltip.Popup aria-hidden className={surface}>
            {reading}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
