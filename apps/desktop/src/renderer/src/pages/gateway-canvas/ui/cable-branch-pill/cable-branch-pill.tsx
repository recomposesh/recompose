import { Popover } from '@base-ui/react/popover';

import type { BranchSeat } from '../../lib/route-graph';

import { ruleShown } from '../../lib/cable-standing';

type CableBranchPillProps = {
  /** Which branch of a judge's router this cable draws, which is the whole of what the pill says. */
  seat: BranchSeat;
};

const pillFrame =
  'inline-flex h-chip max-w-full items-center rounded-chip border border-line-subtle bg-surface-card px-1.5 text-caption font-medium';

/**
 * The branch one cable draws, standing on the cable itself.
 *
 * @summary Reach for it on every cable under a conditional router, where the rule that sends a
 * request down this cable is what a person came to the canvas to read. A labeled branch prints its
 * rule cut to the clear span and opens the whole of it on a press, because a rule long enough to be
 * worth writing is longer than a canvas has room for. The fallback prints its role rather than a
 * rule, quietly, since nobody wrote it and it catches whatever the other branches did not.
 */
export function CableBranchPill({ seat }: CableBranchPillProps) {
  if (seat.kind === 'else') {
    return <span className={`${pillFrame} text-ink-secondary`}>Else</span>;
  }

  return (
    <Popover.Root>
      <Popover.Trigger className={`${pillFrame} text-ink focus-ring-wide`} title={seat.rule}>
        <span className="truncate">{ruleShown(seat.rule)}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={4}>
          <Popover.Popup
            aria-label={`${seat.label} rule`}
            className="z-40 w-56 menu-surface px-3 text-start"
          >
            <span className="block text-mono-caption text-ink-secondary">{seat.label}</span>
            <span className="mt-0.5 block text-detail text-ink">{seat.rule}</span>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
