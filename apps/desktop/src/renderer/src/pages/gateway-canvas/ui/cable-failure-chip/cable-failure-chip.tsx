import { Popover } from '@base-ui/react/popover';

type CableFailureChipProps = {
  /** The status the gateway answered the last request through this binding with. */
  status: number;
  /** The sentence saying what the request came to, written from the status and nothing else. */
  detail: string;
};

/**
 * The last error a binding answered with, standing on the cable that carried it.
 *
 * @summary Reach for it on a failed cable, where a person has seen the color and now wants the
 * reason. It says only that an error stands until it is asked, because a sentence printed over
 * every failed cable would bury the canvas it explains. Pressing it again or Esc puts it away,
 * so reading an error costs a person nothing and leaves the composition where they left it.
 *
 * The reading is a popover rather than a box under the chip, because a cable near the foot of the
 * viewport used to hide its own reason: the box was anchored below and nowhere else. A popover
 * flips to whichever side has room, and it carries the dismissal rules with it.
 */
export function CableFailureChip({ status, detail }: CableFailureChipProps) {
  return (
    <Popover.Root>
      <Popover.Trigger className="inline-flex h-chip items-center rounded-chip border border-cable-failed bg-surface-card px-1.5 text-caption font-medium text-danger-ink focus-ring-wide">
        Last error
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={4}>
          <Popover.Popup aria-label="Last error" className="z-40 w-56 menu-surface px-3 text-start">
            <span className="block text-mono-caption text-ink-secondary">Status {status}</span>
            <span className="mt-0.5 block text-detail text-ink">{detail}</span>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
