import { DayPicker, getDefaultClassNames } from 'react-day-picker';

import type { UsageWindow } from '../../lib/usage-window';

import { atClock, clockOf } from '../../lib/clock-edges';

type RangeCalendarProps = {
  /** The month the left calendar opens on, the right one drawing the month after it. */
  month: number;
  /** Receives the month a step lands on. */
  onMonthChange: (month: number) => void;
  /** The window the grid paints, whose edges carry the solid marks. */
  window: UsageWindow;
  /** Receives the window a person drew, each edge keeping the clock it already stood at. */
  onWindowChange: (next: UsageWindow) => void;
  /** The sentence naming both edges of the standing window. */
  spanWording: string;
};

const painted = getDefaultClassNames();

const classNames = {
  caption_label: `${painted.caption_label} text-detail font-medium text-ink`,
  button_previous: `${painted.button_previous} rounded-control text-ink-secondary focus-ring`,
  button_next: `${painted.button_next} rounded-control text-ink-secondary focus-ring`,
  weekday: `${painted.weekday} text-caption font-normal text-ink-secondary`,
  day_button: `${painted.day_button} rounded-control text-detail focus-ring`,
};

function keptClocks(
  window: UsageWindow,
  from: Date | undefined,
  to: Date | undefined,
): UsageWindow {
  const opened = from === undefined ? window.from : atClock(from.getTime(), clockOf(window.from));
  const closed = to === undefined ? opened : atClock(to.getTime(), clockOf(window.to));

  return { from: opened, to: Math.max(opened, closed) };
}

/**
 * Two months side by side, painting the window a person is drawing.
 *
 * @summary The grid, its keyboard walk, and its month nav come from the calendar library rather
 * than from a hand-built table, and only the paint is ours. Both edges keep the clock they already
 * stood at, so drawing a day never quietly resets a window's times.
 */
export function RangeCalendar({
  month,
  onMonthChange,
  window,
  onWindowChange,
  spanWording,
}: RangeCalendarProps) {
  return (
    <div className="flex flex-col gap-1 px-3.5 py-2.5 usage-calendar">
      <p className="text-center text-caption text-ink-secondary">{spanWording}</p>
      <DayPicker
        classNames={classNames}
        mode="range"
        month={new Date(month)}
        numberOfMonths={2}
        onMonthChange={(next) => {
          onMonthChange(next.getTime());
        }}
        onSelect={(range) => {
          onWindowChange(keptClocks(window, range?.from, range?.to));
        }}
        selected={{ from: new Date(window.from), to: new Date(window.to) }}
        showOutsideDays
      />
    </div>
  );
}
