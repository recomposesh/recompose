import { Checkbox } from '@base-ui/react/checkbox';
import { Popover } from '@base-ui/react/popover';
import { useState } from 'react';

import type { BrandMarkName } from '../../../../shared/ui';

import { Icon, VendorMark } from '../../../../shared/ui';

export type FilterMember = {
  /** The value the filter carries for this member. */
  key: string;
  /** The name a person knows the member by. */
  name: string;
  /** What the member served in the standing window. */
  requests: number;
  /**
   * What tells this member apart from one sharing its name, absent where the name stands alone.
   *
   * @summary A person may file every account under one address, and a list of identical names is a
   * list of nothing. The detail is what the row falls back on to say which one is which.
   */
  detail?: string | undefined;
  /**
   * The vendor drawing the row leads with, absent where the member stands for no vendor at all.
   *
   * @summary Present with no mark inside it still leads with a drawing, because a vendor recompose
   * holds no logo for is still a vendor. Absent leads with nothing, which is what a gateway wants:
   * a gateway is not a vendor, so a vendor stand-in beside it would name the wrong kind of thing.
   */
  lead?: { mark: BrandMarkName | undefined } | undefined;
};

type FilterMenuProps = {
  /** What the filter narrows, which the trigger reads first. */
  label: string;
  /** The name the search field answers to. */
  searchLabel: string;
  /** Every member the window served, largest first. */
  members: readonly FilterMember[];
  /** The members the filter keeps, empty while it stands on everything. */
  selected: readonly string[];
  /** Receives the members the filter should keep, empty for everything. */
  onSelectedChange: (next: readonly string[]) => void;
};

type MemberPick = (next: readonly string[]) => void;

function withMember(selected: readonly string[], key: string): readonly string[] {
  return selected.includes(key) ? selected.filter((held) => held !== key) : [...selected, key];
}

function memberRow(member: FilterMember, selected: readonly string[], onPick: MemberPick) {
  const checked = selected.includes(member.key);

  return (
    <Checkbox.Root
      aria-label={member.detail === undefined ? member.name : `${member.name}, ${member.detail}`}
      checked={checked}
      className={`flex w-full items-center gap-2.25 px-2.5 py-1.5 text-start text-detail text-ink focus-ring-wide row-hover ${checked ? 'bg-surface-selected' : ''}`}
      key={member.key}
      onCheckedChange={() => {
        onPick(withMember(selected, member.key));
      }}
    >
      <span className="flex size-3.5 shrink-0 items-center justify-center rounded-chip border border-line-strong bg-surface-card in-data-checked:border-accent in-data-checked:bg-accent">
        <Checkbox.Indicator className="flex text-highlight-ink">
          <Icon className="size-2.5" name="check" />
        </Checkbox.Indicator>
      </span>
      {member.lead === undefined ? null : (
        <VendorMark className="size-4 shrink-0" name={member.lead.mark} />
      )}
      <span aria-hidden className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{member.name}</span>
        {member.detail === undefined ? null : (
          <span className="truncate text-caption text-ink-secondary">{member.detail}</span>
        )}
      </span>
      <span className="shrink-0 font-mono text-mono-caption text-ink-secondary tabular-nums">
        {member.requests.toLocaleString('en-US')}
      </span>
    </Checkbox.Root>
  );
}

function searchField(searchLabel: string, sought: string, onSought: (next: string) => void) {
  return (
    <div className="px-2.5 pb-2">
      <div className="flex h-control items-center gap-1.5 rounded-control bg-surface-field px-2 has-[:focus-visible]:brightness-112">
        <Icon aria-hidden className="size-3 shrink-0 text-ink-secondary" name="search" />
        <input
          aria-label={searchLabel}
          className="w-full bg-transparent text-detail text-ink outline-none placeholder:text-ink-secondary"
          onInput={(event) => {
            onSought(event.currentTarget.value);
          }}
          placeholder={searchLabel}
          type="search"
          value={sought}
        />
      </div>
    </div>
  );
}

function standingFooter(selected: readonly string[], total: number, onClear: () => void) {
  if (total === 0) {
    return null;
  }

  const counted =
    selected.length === 0
      ? `All ${String(total)} selected`
      : `${String(selected.length)} of ${String(total)} selected`;

  return (
    <div className="mt-2 border-t border-line-faint pt-2">
      <div className="flex items-center justify-between px-2.5">
        <button
          className="rounded-control focus-ring text-detail text-accent-ink"
          onClick={onClear}
          type="button"
        >
          Select all
        </button>
        <span className="text-caption text-ink-secondary">{counted}</span>
      </div>
    </div>
  );
}

function standingWordOf(selected: readonly string[], total: number): string {
  return selected.length === 0 ? 'All' : `${String(selected.length)} of ${String(total)}`;
}

function filterTrigger(label: string, selected: readonly string[], total: number) {
  const standing = selected.length === 0;
  const standingWord = standingWordOf(selected, total);

  return (
    <Popover.Trigger
      aria-label={`${label} ${standingWord}`}
      className={`flex h-control min-w-0 items-center gap-1.5 rounded-control border bg-surface-card px-2 text-detail focus-ring-wide ${standing ? 'border-line-subtle' : 'border-accent'}`}
    >
      <span
        aria-hidden
        className={`min-w-0 truncate ${standing ? 'text-ink-secondary' : 'text-accent-ink'}`}
      >
        {label}
      </span>
      <span
        aria-hidden
        className={`shrink-0 font-medium ${standing ? 'text-ink' : 'text-accent-ink'}`}
      >
        {standingWord}
      </span>
      <Icon aria-hidden className="size-3 shrink-0 text-ink-secondary" name="chevron" />
    </Popover.Trigger>
  );
}

/**
 * One dimension's members behind a trigger that reads how many of them the view keeps.
 *
 * @summary The filter stands on everything until a member is checked, which is why the trigger
 * reads All rather than a full count: a person narrowing one member at a time never has to undo a
 * selection they never made. Unchecking the last member stands the filter back on everything. A
 * window that served nobody names its own quiet rather than reading as a search that missed, and
 * counts a standing selection the window never served so no trigger can read one of none.
 */
export function FilterMenu({
  label,
  searchLabel,
  members,
  selected,
  onSelectedChange,
}: FilterMenuProps) {
  const [sought, setSought] = useState('');
  const total = new Set([...members.map((member) => member.key), ...selected]).size;
  const looking = sought.trim().toLowerCase();
  const listed = members.filter((member) =>
    `${member.name} ${member.detail ?? ''}`.toLowerCase().includes(looking),
  );
  const missing = members.length === 0 ? 'in this window' : 'by that name';

  return (
    <Popover.Root>
      {filterTrigger(label, selected, total)}
      <Popover.Portal>
        <Popover.Positioner align="start" sideOffset={6}>
          <Popover.Popup aria-label={`${label} filter`} className="z-40 w-66 menu-surface">
            {searchField(searchLabel, sought, setSought)}
            {listed.length === 0 ? (
              <p className="px-2.5 py-1.5 text-detail text-ink-secondary">
                {`No ${label.toLowerCase()} ${missing}`}
              </p>
            ) : (
              listed.map((member) => memberRow(member, selected, onSelectedChange))
            )}
            {standingFooter(selected, total, () => {
              onSelectedChange([]);
            })}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
