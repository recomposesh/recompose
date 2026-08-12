import type { IpcEventPayload } from '@recompose/contracts';

import type { ChartMeasure, UsageSearch, UsageSearchRange } from '../../lib/usage-search';

import { spendSnappedRange } from '../../lib/usage-search';

type UsageCommand = IpcEventPayload<'usage:command'>;

const RANGE_BY_COMMAND: Readonly<Partial<Record<UsageCommand, UsageSearchRange>>> = {
  'range-24h': '24h',
  'range-7d': '7d',
  'range-30d': '30d',
};

const MEASURE_BY_COMMAND: Readonly<Partial<Record<UsageCommand, ChartMeasure>>> = {
  'metric-requests': 'requests',
  'metric-latency': 'latency',
  'metric-tokens': 'tokens',
  'metric-spend': 'spend',
};

/**
 * The view a menu command moves the address to, or nothing for the commands that move no view.
 *
 * @summary Menu picks travel the same search the controls write, so a command and a press can
 * never disagree: a measure pick carries the spend snap, and a range pick drops the custom edges
 * the window no longer stands on.
 */
export function movedSearch(command: UsageCommand, search: UsageSearch): UsageSearch | undefined {
  const range = RANGE_BY_COMMAND[command];

  if (range !== undefined) {
    const { from: _from, to: _to, ...kept } = search;

    return { ...kept, range };
  }

  const metric = MEASURE_BY_COMMAND[command];

  if (metric !== undefined) {
    return {
      ...search,
      metric,
      range: metric === 'spend' ? spendSnappedRange(search.range) : search.range,
    };
  }

  return undefined;
}
