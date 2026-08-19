import type { ReactElement } from 'react';

import type { OpenChild, RouterChild } from '../router-child-list/router-child';

import { RowLead } from '../row-lead/row-lead';

const AWAITING_ITS_WORDS = 'Needs a rule';

const NO_RULE_YET = 'No rule yet, so the judge is never offered this branch.';

/**
 * The word the judge answers with for this row, and how many conversations it currently holds.
 *
 * @summary The count stands beside the label rather than tinting the cable, because a pin is a fact
 * about conversations while green on this canvas is a claim about now. It says the word rather than
 * wearing a glyph: at caption size a mark this small reads as a speck, and the whole point of the
 * count is that a person can tell three sticky conversations from thirty.
 *
 * A branch still waiting for its words says so in amber rather than printing an empty line: it is
 * the one row standing between a person and a switch they cannot save, so the row that owes
 * something has to be the row that says it.
 */
function branchLine(child: RouterChild): ReactElement | null {
  if (child.label === undefined) {
    return null;
  }

  const awaited = child.label === '';

  return (
    <span className="flex w-full items-baseline gap-2">
      <span
        className={`min-w-0 flex-1 truncate text-control font-medium ${awaited ? 'text-attention-ink' : 'text-ink'}`}
        data-branch-label=""
      >
        {awaited ? AWAITING_ITS_WORDS : child.label}
      </span>
      {child.pins === undefined ? null : (
        <span className="shrink-0 text-caption text-ink-secondary" data-pin-tally="">
          {`${String(child.pins)} pinned`}
        </span>
      )}
    </span>
  );
}

/**
 * The rule this branch routes by, in one line, with the whole of it a press away in the sheet.
 *
 * @summary A branch holding no rule says so rather than showing an empty line, because a child
 * bound by cable and left unruled receives nothing and a blank row would read as a working branch.
 * The else row shows its reason here instead: it catches what no rule placed, so a rule is the one
 * thing it cannot have, and the reason reads where every other row explains itself.
 */
function ruleLine(child: RouterChild): ReactElement | null {
  if (child.inertReason !== undefined) {
    return (
      <span className="w-full text-detail text-ink-secondary" data-else-reason="">
        {child.inertReason}
      </span>
    );
  }

  if (child.label === undefined && child.rule === undefined) {
    return null;
  }

  return (
    <span className="w-full truncate text-detail text-ink-secondary" data-rule-preview="">
      {child.rule ?? NO_RULE_YET}
    </span>
  );
}

/**
 * Where the row sends what it takes, which is the provider's mark and the model behind it.
 *
 * @summary The account rather than its vendor product, because pooling several accounts of one
 * vendor is what a router is for and the mark alone would print one glyph down the whole ladder.
 * The model reads under the account rather than beside it: both run long, and a row too narrow for
 * the pair has to give up the model rather than the account it belongs to.
 */
function destinationLine(child: RouterChild): ReactElement {
  return (
    <span className="flex w-full min-w-0 items-center gap-2.5" data-destination="">
      <RowLead glyph={child.glyph} glyphTint={child.glyphTint} mark={child.mark} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-control font-medium text-ink" data-child-name="">
          {child.name}
        </span>
        {child.detail === undefined ? null : (
          <span className="truncate font-mono text-mono-value text-ink-secondary">
            {child.detail}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * What one child answers to, stacked so every fact it carries reads whole.
 *
 * @summary The label with its tally, the rule it routes by, and the destination behind it each take
 * a line of their own, because three facts side by side truncate each other away at the width the
 * inspector actually stands at. Stacked, the word a person scans down the ladder starts in one
 * column, the rule reads far enough to recognize, and the binding underneath stays checkable.
 */
export function ChildFace({
  child,
  onOpen,
}: {
  child: RouterChild;
  onOpen: OpenChild;
}): ReactElement {
  return (
    <button
      className="flex min-h-hit-target min-w-0 flex-1 flex-col items-start justify-center gap-0.5 rounded-control focus-ring py-0.5 text-start"
      onClick={() => {
        onOpen(child);
      }}
      type="button"
    >
      {branchLine(child)}
      {ruleLine(child)}
      {destinationLine(child)}
    </button>
  );
}
