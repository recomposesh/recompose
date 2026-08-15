import type { ReactNode } from 'react';

import type { IconName } from '../../../../shared/ui';

import { Button, Icon } from '../../../../shared/ui';

type SubjectHead = {
  lead: ReactNode;
  leadClasses: string;
  kicker: string;
  name: string;
};

/** The head strip naming the selected subject, with its tinted lead mark and kicker. */
export function subjectHead({ lead, leadClasses, kicker, name }: SubjectHead): ReactNode {
  return (
    <header className="flex items-center gap-2.5 px-4 pt-4 pb-1">
      <span
        className={`flex size-8.5 shrink-0 items-center justify-center rounded-control ${leadClasses}`}
      >
        {lead}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-footnote leading-none font-bold tracking-wider text-ink-secondary uppercase">
          {kicker}
        </p>
        <h2 className="truncate text-body leading-tight font-semibold text-ink">{name}</h2>
      </div>
    </header>
  );
}

/** The lead glyph at the size every subject head wears it. */
export function glyph(name: IconName): ReactNode {
  return <Icon className="size-4" name={name} />;
}

/** One read-only fact in a field box, with an optional control on its end edge. */
export function factRow(label: string, value: ReactNode, control?: ReactNode): ReactNode {
  return (
    <div className="flex min-h-sheet-row items-center gap-2 border-t border-line-faint px-3 py-1.5 first:border-t-0">
      <span className="shrink-0 text-control text-ink">{label}</span>
      <span className="ms-auto truncate font-mono text-mono-value text-ink">{value}</span>
      {control}
    </div>
  );
}

/** A section title inside the inspector body, with an optional tally beside it. */
export function sectionHeading(title: string, tally?: ReactNode): ReactNode {
  return (
    <h3 className="mt-3.5 mb-1.5 flex min-w-0 items-center gap-1.5 px-1 text-caption font-bold text-ink-secondary">
      <span className="shrink-0">{title}</span>
      {tally}
    </h3>
  );
}

/**
 * A section title that carries the Edit affordance while its box rests.
 *
 * @summary The affordance prints at caption size beside the title, which leaves its ink shorter
 * than the 24 pixel target the canvas accessibility contract names. It wears `hit-area` rather
 * than growing, because a taller button would push the title and every field under it down.
 */
export function editableSectionHeading(
  title: string,
  editing: boolean,
  onEdit: () => void,
): ReactNode {
  return sectionHeading(
    title,
    editing ? null : (
      <button
        className="hit-area ms-auto shrink-0 rounded-control focus-ring px-1 text-caption font-medium text-accent-ink"
        onClick={onEdit}
        type="button"
      >
        Edit
      </button>
    ),
  );
}

/** One editable field in a field box, labeled on its start edge. */
export function editRow(label: string, control: ReactNode): ReactNode {
  return (
    <div className="flex min-h-sheet-row items-center gap-2 border-t border-line-faint px-3 py-1.5 first:border-t-0">
      <span className="w-24 shrink-0 text-control whitespace-nowrap text-ink">{label}</span>
      <span className="min-w-0 flex-1">{control}</span>
    </div>
  );
}

type EditFooterActs = {
  onCancel: () => void;
  onSave: () => void;
};

function editRefusal(refused: string | undefined): ReactNode {
  return refused === undefined ? null : (
    <p className="mt-2 px-1 text-caption text-danger-ink" role="alert">
      {refused}
    </p>
  );
}

/** The Cancel and Save pair under an editing box, with the refusal the last save left. */
export function editFooter(
  { onCancel, onSave }: EditFooterActs,
  refused: string | undefined,
): ReactNode {
  return (
    <>
      <div className="mt-2 flex justify-end gap-2">
        <button className="push-button" onClick={onCancel} type="button">
          Cancel
        </button>
        <button className="push-button-primary" onClick={onSave} type="button">
          Save
        </button>
      </div>
      {editRefusal(refused)}
    </>
  );
}

const HARNESS_NOTICE =
  'Saved. Restart the harness you point at this gateway so it picks the change up.';

/** The restart notice a saved definition leaves behind, standing only after a save landed. */
export function savedNotice(saved: boolean): ReactNode {
  return saved ? (
    <p className="mt-2 px-1 text-caption text-attention-ink" role="status">
      {HARNESS_NOTICE}
    </p>
  ) : null;
}

type DeleteAction = { label: string; onPress: () => void };

function deleteFooter(action: DeleteAction | undefined): ReactNode {
  if (action === undefined) {
    return null;
  }

  const { label, onPress } = action;

  return (
    <div className="shrink-0 p-3.5">
      <Button fullWidth glyph="trash" onPress={onPress} variant="danger-secondary">
        {label}
      </Button>
    </div>
  );
}

/** The whole subject layout: head, scrolling body, and the deletion footer when one belongs. */
export function subjectShell(
  head: SubjectHead,
  body: ReactNode,
  deleteAction?: DeleteAction,
): ReactNode {
  return (
    <>
      {subjectHead(head)}
      <div className="flex-1 overflow-y-auto px-3.5 pb-4">{body}</div>
      {deleteFooter(deleteAction)}
    </>
  );
}
