import type { UsageWindow } from './usage-window';

/** How wide one slot along the axis stands. */
export type SlotWidth = 'minute' | 'hour' | 'day';

const MINUTE_MS = 60_000;

const HOUR_MS = 3_600_000;

const MOST_SLOTS = 1_500;

function flooredTo(at: number, span: number): number {
  return at - (at % span);
}

function localMidnight(at: number): number {
  const day = new Date(at);

  day.setHours(0, 0, 0, 0);

  return day.getTime();
}

function nextDay(at: number): number {
  const day = new Date(at);

  day.setDate(day.getDate() + 1);

  return localMidnight(day.getTime());
}

function steppedSlots(from: number, to: number, step: (at: number) => number): readonly number[] {
  const slots: number[] = [];

  for (let at = from; at <= to && slots.length < MOST_SLOTS; at = step(at)) {
    slots.push(at);
  }

  return slots;
}

/**
 * Every slot the window opens over, whether or not anything was served in it.
 *
 * @summary The axis stands for the window a person asked for rather than for the buckets that
 * happen to carry traffic, so a quiet Tuesday keeps its place between two busy ones. A day slot
 * breaks at the reader's own midnight, which is where the report folds its days.
 */
export function windowSlots(window: UsageWindow, width: SlotWidth): readonly number[] {
  const closes = Math.max(window.from, window.to - 1);

  if (width === 'day') {
    return steppedSlots(localMidnight(window.from), localMidnight(closes), nextDay);
  }

  const span = width === 'minute' ? MINUTE_MS : HOUR_MS;

  return steppedSlots(flooredTo(window.from, span), flooredTo(closes, span), (at) => at + span);
}
