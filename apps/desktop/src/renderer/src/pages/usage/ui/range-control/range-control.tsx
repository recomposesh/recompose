import { Popover } from '@base-ui/react/popover';
import { useEffect, useState } from 'react';

import type { PresetRange, UsageSearch, UsageSearchRange } from '../../lib/usage-search';
import type { UsageWindow } from '../../lib/usage-window';

import { SegmentedControl } from '../../../../shared/ui';
import { startOfMonth } from '../../lib/calendar-grid';
import { drawnWith, settledDrawing } from '../../lib/drawn-window';
import { withRange } from '../../lib/usage-search';
import { presetWindows, windowFor } from '../../lib/usage-window';
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

const ROW_PAINT = 'rounded-control px-2 py-1.5 text-start text-detail';
const PICKED_PAINT = 'bg-surface-selected text-ink';

function presetRow(picked: boolean): string {
  return `${ROW_PAINT} focus-ring ${picked ? PICKED_PAINT : 'text-ink row-hover'}`;
}

function presetList(onPick: (range: PresetRange) => void, picked: UsageSearchRange) {
  return (
    <div className="flex w-37.5 flex-col gap-0.5 border-e border-line-faint px-2 py-2.5">
      {presetWindows.map((preset) => (
        <button
          aria-current={preset.range === picked ? 'true' : undefined}
          className={presetRow(preset.range === picked)}
          key={preset.range}
          onClick={() => {
            onPick(preset.range);
          }}
          type="button"
        >
          {preset.label}
        </button>
      ))}
      <span
        aria-current={picked === 'custom' ? 'true' : undefined}
        className={`${ROW_PAINT} ${picked === 'custom' ? PICKED_PAINT : 'text-ink-secondary'}`}
      >
        Custom range
      </span>
    </div>
  );
}

function draftedOver(search: UsageSearch, now: number) {
  const window = windowFor(search, now);

  return { range: search.range, drawn: settledDrawing(window), month: startOfMonth(window.from) };
}

function useDraftedWindow(search: UsageSearch, now: number) {
  const [drafted, setDrafted] = useState(() => draftedOver(search, now));
  const [open, setOpen] = useState(false);

  useEffect(
    () =>
      window.recomposeEvents['usage:command']((command) => {
        if (command === 'range-custom') {
          setDrafted(draftedOver(search, now));
          setOpen(true);
        }
      }),
    [search, now],
  );

  return {
    picked: drafted.range,
    window: drafted.drawn.window,
    month: drafted.month,
    onPreset: (range: PresetRange) => {
      setDrafted(draftedOver(withRange(search, range), now));
    },
    onDrawn: (next: UsageWindow) => {
      setDrafted({ ...drafted, range: 'custom', drawn: settledDrawing(next) });
    },
    onDayPress: (day: number) => {
      setDrafted({ ...drafted, range: 'custom', drawn: drawnWith(drafted.drawn, day) });
    },
    setMonth: (month: number) => {
      setDrafted({ ...drafted, month });
    },
    open,
    onOpenChange: (next: boolean) => {
      if (next) {
        setDrafted(draftedOver(search, now));
      }

      setOpen(next);
    },
  };
}

type DrawingProps = {
  search: UsageSearch;
  now: number;
  drawing: ReturnType<typeof useDraftedWindow>;
  onSettle: (next: UsageSearch) => void;
};

function settledSearch(search: UsageSearch, drawing: ReturnType<typeof useDraftedWindow>) {
  return drawing.picked === 'custom'
    ? { ...search, range: 'custom' as const, ...appliedWindow(drawing.window) }
    : withRange(search, drawing.picked);
}

function drawingPopup({ search, now, drawing, onSettle }: DrawingProps) {
  const { window, month } = drawing;

  return (
    <Popover.Popup aria-label="Custom window" className="z-40 w-144.25 menu-surface">
      <div className="flex">
        {presetList((range) => {
          drawing.onPreset(range);
        }, drawing.picked)}
        <RangeCalendar
          month={month}
          onDayPress={(day) => {
            drawing.onDayPress(day);
          }}
          onMonthChange={(next) => {
            drawing.setMonth(next);
          }}
          spanWording={`${spanFormat.format(window.from)} – ${spanFormat.format(window.to)}`}
          window={window}
        />
      </div>
      <RangeWindowFooter
        drafted={window}
        onApply={() => {
          onSettle(settledSearch(search, drawing));
        }}
        onCancel={() => {
          drawing.onOpenChange(false);
        }}
        onDraftedChange={(next) => {
          drawing.onDrawn(next);
        }}
        zone={zoneWording(now)}
      />
    </Popover.Popup>
  );
}

/**
 * The window control: four presets, and a window picked or drawn beside a calendar.
 *
 * @summary Every act inside the popover draws into a window standing beside the one on screen, and
 * Apply is the only act that lands it, so half a window never lands as a reading nobody asked for.
 * The preset the standing window came from reads as picked whenever the popover opens, because the
 * view carries the range it stands on rather than only the edges that range worked out to.
 */
export function RangeControl({ search, onSearchChange, retentionDays, now }: RangeControlProps) {
  const drawing = useDraftedWindow(search, now);
  const offSegment = !PRESET_OPTIONS.some((option) => option.value === search.range);
  const settle = (next: UsageSearch) => {
    onSearchChange(next);
    drawing.onOpenChange(false);
  };

  return (
    <div className="inline-flex h-segment items-center gap-hairline rounded-control bg-surface-track p-hairline">
      <SegmentedControl
        label="Range"
        onChangeValue={(range) => {
          onSearchChange(withRange(search, range));
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
          className={`flex h-chip items-center rounded-chip focus-ring px-2 text-detail ${offSegment ? 'chip-selected text-ink' : 'text-ink-secondary'}`}
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
