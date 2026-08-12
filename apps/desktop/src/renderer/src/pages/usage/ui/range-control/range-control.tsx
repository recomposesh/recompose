import { Popover } from '@base-ui/react/popover';
import { useState } from 'react';

import type { UsageSearch, UsageSearchRange } from '../../lib/usage-search';
import type { PresetKey, UsageWindow } from '../../lib/usage-window';

import { SegmentedControl } from '../../../../shared/ui';
import { startOfMonth } from '../../lib/calendar-grid';
import { presetWindows, searchForPreset, windowFor } from '../../lib/usage-window';
import { RangeCalendar } from '../range-calendar/range-calendar';
import { RangeWindowFooter } from '../range-window-footer/range-window-footer';

type RangeControlProps = {
  /** The view whose window the control stands for. */
  search: UsageSearch;
  /** Receives the whole next view whenever the window moves. */
  onSearchChange: (next: UsageSearch) => void;
  /** How many days of history the ledger keeps, which bounds the widest preset. */
  retentionDays: number;
  /** The instant the window reaches back from. */
  now: number;
};

const PRESET_OPTIONS: readonly { value: UsageSearchRange; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
];

const DAY_MS = 86_400_000;

const spanFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const zoneName = new Intl.DateTimeFormat('en-US', { timeZoneName: 'shortOffset' });

function zoneWording(at: number): string {
  return zoneName.formatToParts(at).find((part) => part.type === 'timeZoneName')?.value ?? 'UTC';
}

function appliedWindow(drafted: UsageWindow): UsageWindow {
  const from = Math.min(drafted.from, drafted.to);
  const to = Math.max(drafted.from, drafted.to);

  return { from, to: from === to ? to + DAY_MS : to };
}

function rangeOptions(retentionDays: number) {
  return PRESET_OPTIONS.map((option) =>
    option.value === '30d' && retentionDays < 30
      ? { ...option, inertReason: `Usage retention holds ${String(retentionDays)} days` }
      : option,
  );
}

function presetList(onPick: (key: PresetKey) => void, custom: boolean) {
  return (
    <div className="flex w-38 flex-col gap-0.5 border-e border-line-faint p-2">
      {presetWindows.map((preset) => (
        <button
          className="rounded-control focus-ring px-2 py-1.5 text-start text-detail text-ink row-hover"
          key={preset.key}
          onClick={() => {
            onPick(preset.key);
          }}
          type="button"
        >
          {preset.label}
        </button>
      ))}
      <span
        aria-current={custom ? 'true' : undefined}
        className={`rounded-control px-2 py-1.5 text-start text-detail ${custom ? 'bg-surface-selected text-accent-ink' : 'text-ink-secondary'}`}
      >
        Custom range
      </span>
    </div>
  );
}

function usePresetWindow(search: UsageSearch, now: number) {
  const standing = windowFor(search, now);
  const [drafted, setDrafted] = useState(standing);
  const [month, setMonth] = useState(() => startOfMonth(standing.from));
  const [open, setOpen] = useState(false);

  return {
    drafted,
    setDrafted,
    month,
    setMonth,
    open,
    onOpenChange: (next: boolean) => {
      if (next) {
        setDrafted(standing);
        setMonth(startOfMonth(standing.from));
      }

      setOpen(next);
    },
  };
}

type DrawingProps = {
  search: UsageSearch;
  now: number;
  drawing: ReturnType<typeof usePresetWindow>;
  onSettle: (next: UsageSearch) => void;
};

function drawingPopup({ search, now, drawing, onSettle }: DrawingProps) {
  const { drafted, month } = drawing;

  return (
    <Popover.Popup aria-label="Custom window" className="z-40 w-145 menu-surface">
      <div className="flex">
        {presetList((key) => {
          onSettle(searchForPreset(search, key, now));
        }, search.range === 'custom')}
        <RangeCalendar
          month={month}
          onMonthChange={(next) => {
            drawing.setMonth(next);
          }}
          onWindowChange={(next) => {
            drawing.setDrafted(next);
          }}
          spanWording={`${spanFormat.format(drafted.from)} – ${spanFormat.format(drafted.to)}`}
          window={drafted}
        />
      </div>
      <RangeWindowFooter
        drafted={drafted}
        onApply={() => {
          onSettle({ ...search, range: 'custom', ...appliedWindow(drafted) });
        }}
        onCancel={() => {
          drawing.onOpenChange(false);
        }}
        onDraftedChange={(next) => {
          drawing.setDrafted(next);
        }}
        zone={zoneWording(now)}
      />
    </Popover.Popup>
  );
}

/**
 * The window control: four presets, and a custom window drawn on a calendar.
 *
 * @summary The presets commit as they are pressed, because a window reaching back from now needs
 * nothing else said about it. A custom window is drawn first and applied after, so half a window
 * never lands on the screen as a reading nobody asked for.
 */
export function RangeControl({ search, onSearchChange, retentionDays, now }: RangeControlProps) {
  const drawing = usePresetWindow(search, now);
  const custom = search.range === 'custom';
  const settle = (next: UsageSearch) => {
    onSearchChange(next);
    drawing.onOpenChange(false);
  };

  return (
    <div className="inline-flex h-segment items-center gap-hairline rounded-control bg-surface-track p-hairline">
      <SegmentedControl
        label="Range"
        onChangeValue={(range) => {
          const { from: _from, to: _to, ...kept } = search;

          onSearchChange({ ...kept, range });
        }}
        options={rangeOptions(retentionDays)}
        value={search.range}
      />
      <Popover.Root
        onOpenChange={(next) => {
          drawing.onOpenChange(next);
        }}
        open={drawing.open}
      >
        <Popover.Trigger
          className={`flex h-chip items-center rounded-chip focus-ring px-2 text-detail ${custom ? 'chip-selected text-ink' : 'text-ink-secondary'}`}
        >
          Custom
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner align="end" sideOffset={6}>
            {drawingPopup({ search, now, drawing, onSettle: settle })}
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
