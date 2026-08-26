import type { BranchSeat } from '../../lib/route-graph';

import { Tooltip } from '../../../../shared/ui';

type CableBranchPillProps = {
  /** Which branch of a judge's router this cable draws, which is the whole of what the pill says. */
  seat: BranchSeat;
  /** Receives a press on the label, which opens the editor that words this branch. */
  onWord: () => void;
};

const pillFrame =
  'inline-flex h-chip max-w-full items-center rounded-chip border border-line-subtle bg-surface-card text-caption font-medium';

const UNWORDED = 'Name this branch';

/**
 * What pressing a worded pill does, said where a person meets the pill rather than in a menu.
 *
 * @summary A button carrying a bare word announces a bare word, and a person who set a rule once
 * read this pill as a caption and concluded the rule was fixed for good. It rides as the control's
 * description rather than as its name, because the word the judge answers with is the fact a
 * reader needs first and a name beginning `Edit` would bury it.
 */
const WHAT_A_PRESS_OPENS = "Press to edit this branch's prompt.";

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
    <Tooltip label={label} note={WHAT_A_PRESS_OPENS} side="top">
      <button
        className={`${pillFrame} max-w-24 truncate px-1.5 text-mono-caption text-ink focus-ring-wide`}
        onClick={onWord}
        type="button"
      >
        {label}
      </button>
    </Tooltip>
  );
}

/**
 * The branch one cable draws, standing on the cable itself.
 *
 * @summary Reach for it on every cable under a conditional router, where the word the judge answers
 * with is what tells one cable from its siblings. The label alone: the rule reads in the inspector
 * row and edits in the sheet, so a canvas holding a ladder of branches stays legible at the zoom a
 * whole composition fits in rather than turning into a wall of prose. Pressing the label opens the
 * editor, because the label is the word the judge answers with. A branch nobody has worded yet
 * wears the attention tint and says so, so an unfinished composition reads as unfinished on the
 * canvas rather than only in a panel. The fallback prints its role quietly and answers no press,
 * since nobody wrote it and it catches whatever the other branches did not.
 */
export function CableBranchPill({ seat, onWord }: CableBranchPillProps) {
  if (seat.kind === 'else') {
    return <span className={`${pillFrame} px-1.5 text-ink-secondary`}>Else</span>;
  }

  if (seat.kind === 'draft') {
    return draftPill(onWord);
  }

  return labelPress(seat.label, onWord);
}
