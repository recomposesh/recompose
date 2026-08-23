/**
 * The grid a logged request reads across, held in one place so the heads can stand over it.
 *
 * @summary A head that disagreed with its column by a pixel would point a reader at the wrong cell,
 * so the widths and the narrow-drawer classes live here rather than on the row: a column that
 * leaves a narrow drawer takes its head with it. Only geometry rides here, never ink, because the
 * ink on a cell says what that request came to while the head says nothing about any one request.
 * Every fixed column holds a width rather than a floor, since a duration allowed to grow while it
 * ticks would drag the columns beside it out from under their own heads, row by row.
 */
export const LOG_COLUMNS = {
  time: 'w-16 shrink-0',
  method: 'w-12 shrink-0 @max-[19rem]:hidden',
  model: 'flex min-w-0 flex-1 items-center gap-1 overflow-hidden',
  provider: 'w-20 shrink-0 truncate @max-[24rem]:hidden',
  account: 'w-36 shrink-0 truncate @max-[32rem]:hidden',
  status: 'w-11 shrink-0 text-end',
  duration: 'w-14 shrink-0 truncate text-end @max-[13rem]:hidden',
  failure: 'min-w-0 flex-1 truncate',
} as const;

/** The line every row and the heads above it are laid out on, so the two can never drift apart. */
export const LOG_GRID_LINE =
  'flex h-5 items-center gap-1 px-2 font-mono text-mono-caption whitespace-nowrap';

/**
 * What each column holds, in the order the row lays them out.
 *
 * @summary The heads read as nouns rather than as sentences, because they stand over ten thousand
 * rows and a reader passes them once. `Took` heads the duration because `Duration` cannot fit the
 * column its own cells fit, and a head wider than its column would sit over the wrong one.
 */
export const LOG_COLUMN_HEADS = [
  { className: LOG_COLUMNS.time, head: 'Time' },
  { className: LOG_COLUMNS.method, head: 'Method' },
  { className: LOG_COLUMNS.model, head: 'Model' },
  { className: LOG_COLUMNS.provider, head: 'Provider' },
  { className: LOG_COLUMNS.account, head: 'Account' },
  { className: LOG_COLUMNS.status, head: 'Status' },
  { className: LOG_COLUMNS.duration, head: 'Took' },
  { className: LOG_COLUMNS.failure, head: 'Detail' },
] as const;
