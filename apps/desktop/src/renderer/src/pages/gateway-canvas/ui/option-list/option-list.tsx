import type { ReactElement } from 'react';

import { useEffect, useRef, useState } from 'react';

import type { RowLeadFace } from '../row-lead/row-lead';

import { Icon, placeFocus } from '../../../../shared/ui';
import { RowLead } from '../row-lead/row-lead';

export type OptionRow = RowLeadFace & {
  /** The value picking this option settles on. */
  id: string;
  /** What the option reads as, which is what a person searches by name. */
  name: string;
  /**
   * A quieter fact under the name, where one tells two options apart.
   *
   * @summary It rides a second line rather than the name's own, so two options that differ only in
   * their fact stay one glance apart: every name begins in the same column whatever follows it.
   */
  detail?: string | undefined;
};

export type OptionGroup = {
  /** What the options beneath are gathered as, or nothing where one flat list needs no heading. */
  heading?: string | undefined;
  options: readonly OptionRow[];
};

type OptionListProps = {
  /** The options on offer, under the headings they read beneath. */
  groups: readonly OptionGroup[];
  /** The option settled on, which reads as picked. */
  picked: string | undefined;
  /** Receives the id of the option the person picked. */
  onPick: (id: string) => void;
  /** Accessible name of the search field, naming what a person is searching. */
  searchLabel: string;
  /** Sentence standing where the search matched nothing at all. */
  nothingMatched: string;
  /** Forces the search field to stand and take focus when this list arrives. */
  focusSearch?: boolean;
};

const SEARCH_APPEARS_ABOVE = 6;

function searchAppears(groups: readonly OptionGroup[], focusSearch: boolean): boolean {
  const offered = groups.reduce((count, group) => count + group.options.length, 0);

  return focusSearch || offered > SEARCH_APPEARS_ABOVE;
}

function narrowedWhileSearchable(
  groups: readonly OptionGroup[],
  searchable: boolean,
  typed: string,
): readonly OptionGroup[] {
  return searchable ? matching(groups, typed) : groups;
}

function matching(groups: readonly OptionGroup[], typed: string): readonly OptionGroup[] {
  const sought = typed.trim().toLowerCase();

  if (sought === '') {
    return groups;
  }

  const narrowed: OptionGroup[] = [];

  for (const group of groups) {
    const options = group.options.filter((option) =>
      `${option.name} ${option.id} ${option.detail ?? ''}`.toLowerCase().includes(sought),
    );

    if (options.length > 0) {
      narrowed.push({ ...group, options });
    }
  }

  return narrowed;
}

/**
 * One option, read as a name with whatever tells it apart standing under it.
 *
 * @summary The fact rides a second line rather than the name's own, because a menu row is scanned
 * down its start edge: two names that differ only in their fact stay one glance apart when both
 * names begin in the same column. It leaves the row a line taller, which is what a pointer wants.
 */
function optionRow(option: OptionRow, picked: boolean, onPick: (id: string) => void): ReactElement {
  return (
    <li key={option.id}>
      <button
        aria-pressed={picked}
        className={`flex min-h-10 w-full items-center gap-2.25 rounded-control focus-ring px-2.5 py-1 text-start text-control row-hover ${picked ? 'bg-accent/10' : ''}`}
        onClick={() => {
          onPick(option.id);
        }}
        type="button"
      >
        <RowLead glyph={option.glyph} glyphTint={option.glyphTint} mark={option.mark} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-ink">{option.name}</span>{' '}
          {option.detail === undefined ? null : (
            <span className="truncate text-footnote text-ink-secondary">{option.detail}</span>
          )}
        </span>
        {picked ? <Icon className="size-4 shrink-0 text-accent-ink" name="check" /> : null}
      </button>
    </li>
  );
}

function gatheredOptions(
  group: OptionGroup,
  picked: string | undefined,
  onPick: (id: string) => void,
): ReactElement {
  return (
    <div key={group.heading ?? 'ungathered'}>
      {group.heading === undefined ? null : (
        <p className="px-2 pt-1.5 pb-0.5 text-footnote font-bold tracking-wider text-ink-secondary uppercase">
          {group.heading}
        </p>
      )}
      <ul>{group.options.map((option) => optionRow(option, option.id === picked, onPick))}</ul>
    </div>
  );
}

/**
 * A list that takes one pick, gathered under headings and searchable once it grows.
 *
 * @summary Reach for it wherever a field holds a value nobody types: a stored account, a model a
 * provider serves. The search appears only once the list outgrows a glance, so a short list reads
 * whole and a long one narrows, and a search matching nothing says so rather than emptying itself.
 * A query narrows only while its field is on screen, so a short list that replaces a long one always
 * reads whole rather than staying filtered by words a person can no longer see or clear.
 */
export function OptionList({
  groups,
  picked,
  onPick,
  searchLabel,
  nothingMatched,
  focusSearch = false,
}: OptionListProps) {
  const [typed, setTyped] = useState('');
  const search = useRef<HTMLInputElement>(null);

  const searchable = searchAppears(groups, focusSearch);
  const shown = narrowedWhileSearchable(groups, searchable, typed);

  useEffect(() => {
    if (focusSearch) {
      placeFocus(search.current);
    }
  }, [focusSearch]);

  return (
    <div className="flex flex-col gap-1">
      {searchable ? (
        <input
          aria-label={searchLabel}
          className="field-control w-full placeholder:text-ink-tertiary focus-visible:bg-surface-hover data-placed-focus:bg-surface-hover"
          onInput={(event) => {
            setTyped(event.currentTarget.value);
          }}
          placeholder={searchLabel}
          ref={search}
          type="search"
          value={typed}
        />
      ) : null}
      {shown.map((group) => gatheredOptions(group, picked, onPick))}
      {shown.length === 0 ? (
        <p className="px-2 py-1.5 text-detail text-ink-secondary">{nothingMatched}</p>
      ) : null}
    </div>
  );
}
