import type { ReactElement } from 'react';

import type { OpenChild, RouterChild } from '../router-child-list/router-child';

import { RowLead } from '../row-lead/row-lead';

/**
 * What one child answers to, with the binding it stands for under it.
 *
 * @summary The two read as two lines rather than one, because the account and the real model it
 * serves are both long and side by side each one truncates the other away. Stacked, the name a
 * person scans down the ladder starts in one column and the binding they check reads whole.
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
      className="flex min-h-hit-target min-w-0 flex-1 items-center gap-2.5 rounded-control focus-ring text-start"
      onClick={() => {
        onOpen(child);
      }}
      type="button"
    >
      <RowLead glyph={child.glyph} glyphTint={child.glyphTint} mark={child.mark} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-control font-medium text-ink" data-child-name="">
          {child.name}
        </span>{' '}
        {child.detail === undefined ? null : (
          <span className="truncate font-mono text-mono-value text-ink-secondary">
            {child.detail}
          </span>
        )}
        {ruleLine(child)}
      </span>
    </button>
  );
}

const NO_RULE_YET = 'No rule yet, so the judge is never offered this branch.';

/**
 * The rule this branch routes by, in one line, with the whole of it a press away in the sheet.
 *
 * @summary A branch holding no rule says so rather than showing an empty line, because a child
 * bound by cable and left unruled receives nothing and a blank row would read as a working branch.
 * The else row shows neither: it catches what no rule placed, so a rule is the one thing it cannot
 * have.
 */
function ruleLine(child: RouterChild): ReactElement | null {
  if (child.inertReason !== undefined) {
    return (
      <span className="text-detail text-ink-secondary" data-else-reason="">
        {child.inertReason}
      </span>
    );
  }

  if (child.label === undefined && child.rule === undefined) {
    return null;
  }

  return (
    <span className="truncate text-detail text-ink-secondary" data-rule-preview="">
      {child.rule ?? NO_RULE_YET}
    </span>
  );
}
