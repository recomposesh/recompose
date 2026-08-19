import { Popover } from '@base-ui/react/popover';

import type { BranchSeat } from '../../lib/route-graph';

import { ruleShown } from '../../lib/cable-standing';

type CableBranchPillProps = {
  /** Which branch of a judge's router this cable draws, which is the whole of what the pill says. */
  seat: BranchSeat;
  /** Receives a press on the label, which opens the editor that words this branch. */
  onWord: () => void;
};

const pillFrame =
  'inline-flex h-chip max-w-full items-center rounded-chip border border-line-subtle bg-surface-card text-caption font-medium';

const UNWORDED = 'Name this branch';

function draftPill(onWord: () => void) {
  return (
    <button
      className={`${pillFrame} border-attention px-1.5 text-attention-ink focus-ring-wide`}
      onClick={onWord}
      type="button"
    >
      <span className="truncate">{UNWORDED}</span>
    </button>
  );
}

/**
 * The label a person gave one branch, which pressing opens for rewording.
 *
 * @summary The label is the judge's own vocabulary rather than decoration, so renaming it reroutes
 * traffic and the press that starts a rename is the same one every other name on this canvas takes.
 */
function labelPress(label: string, onWord: () => void) {
  return (
    <button
      className="max-w-24 truncate rounded-chip px-1.5 text-mono-caption text-ink focus-ring-wide"
      onClick={onWord}
      type="button"
    >
      {label}
    </button>
  );
}

function rulePress(seat: { label: string; rule: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className="max-w-32 truncate rounded-chip pe-1.5 text-ink-secondary focus-ring-wide"
        title={seat.rule}
      >
        {ruleShown(seat.rule)}
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

/**
 * The branch one cable draws, standing on the cable itself.
 *
 * @summary Reach for it on every cable under a conditional router, where the rule that sends a
 * request down this cable is what a person came to the canvas to read. A worded branch stands its
 * label beside its rule cut to the clear span: the label opens the editor, because the label is the
 * word the judge answers with, and the rule opens the whole of it read-only, because a rule long
 * enough to be worth writing is longer than a canvas has room for. A branch nobody has worded yet
 * wears the attention tint and says so, so an unfinished composition reads as unfinished on the
 * canvas rather than only in a panel. The fallback prints its role rather than a rule, quietly,
 * since nobody wrote it and it catches whatever the other branches did not.
 */
export function CableBranchPill({ seat, onWord }: CableBranchPillProps) {
  if (seat.kind === 'else') {
    return <span className={`${pillFrame} px-1.5 text-ink-secondary`}>Else</span>;
  }

  if (seat.kind === 'draft') {
    return draftPill(onWord);
  }

  return (
    <span className={pillFrame}>
      {labelPress(seat.label, onWord)}
      {rulePress(seat)}
    </span>
  );
}
