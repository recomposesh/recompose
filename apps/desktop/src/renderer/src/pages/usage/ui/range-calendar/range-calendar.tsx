import { DayPicker, getDefaultClassNames } from 'react-day-picker';

import type { UsageWindow } from '../../lib/usage-window';

import { Icon } from '../../../../shared/ui';

type RangeCalendarProps = {
  /** The month the left calendar opens on, the right one drawing the month after it. */
  month: number;
  /** Receives the month a step lands on. */
  onMonthChange: (month: number) => void;
  /** The window the grid paints, whose edges carry the solid marks. */
  window: UsageWindow;
  /** Receives the day a person pressed, at its own local midnight. */
  onDayPress: (day: number) => void;
  /** The sentence naming both edges of the standing window. */
  spanWording: string;
};

const painted = getDefaultClassNames();

const classNames = {
  caption_label: `${painted.caption_label} text-detail font-medium text-ink`,
  weekday: `${painted.weekday} text-caption font-normal text-ink-secondary`,
  day_button: `${painted.day_button} rounded-control text-detail focus-ring`,
};

const MONTH_STEP = 1;

function steppedMonth(month: number, months: number): number {
  const stepped = new Date(month);

  stepped.setMonth(stepped.getMonth() + months);

  return stepped.getTime();
}

function monthStep(label: string, turn: string, onPress: () => void) {
  return (
    <button
      aria-label={label}
      className="flex size-5 items-center justify-center rounded-control focus-ring text-ink-secondary"
      onClick={onPress}
      type="button"
    >
      <Icon aria-hidden className={`size-3.5 ${turn}`} name="chevron" />
    </button>
  );
}

/**
 * Two months side by side, painting the window a person is drawing.
 *
 * @summary The grid, its keyboard walk, and its month nav come from the calendar library rather
 * than from a hand-built table, and only the paint is ours. What a press means for the window is
 * not the library's to decide, because it only ever sees a complete range and would widen one
 * where a person meant to start over, so the press rides out as the day it landed on. The library
 * only paints the window it is handed while a select handler stands, so the handler stays even
 * though the range it works out goes unread.
 */
export function RangeCalendar({
  month,
  onMonthChange,
  window,
  onDayPress,
  spanWording,
}: RangeCalendarProps) {
  return (
    <div className="flex flex-col usage-calendar gap-2.5 px-3.5 py-2.5">
      <div className="flex items-center justify-between">
        {monthStep('Previous month', 'rotate-90', () => {
          onMonthChange(steppedMonth(month, -MONTH_STEP));
        })}
        <p className="text-caption text-ink-secondary">{spanWording}</p>
        {monthStep('Next month', '-rotate-90', () => {
          onMonthChange(steppedMonth(month, MONTH_STEP));
        })}
      </div>
      <DayPicker
        classNames={classNames}
        hideNavigation
        mode="range"
        month={new Date(month)}
        numberOfMonths={2}
        onMonthChange={(next) => {
          onMonthChange(next.getTime());
        }}
        onSelect={(_walked, day) => {
          onDayPress(day.getTime());
        }}
        selected={{ from: new Date(window.from), to: new Date(window.to) }}
      />
    </div>
  );
}
