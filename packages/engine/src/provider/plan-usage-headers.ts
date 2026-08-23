import type { PlanUsageWindow } from '@recompose/contracts';

const MINUTES_IN_A_DAY = 1440;

const MS_IN_SECOND = 1000;

/** Anthropic reports a share of the window already spent, Codex a percentage of it. */
const A_WHOLE = 1;

const A_HUNDRED = 100;

const ANTHROPIC_UNIFIED = [
  { prefix: 'anthropic-ratelimit-unified-5h', length: '5h' },
  { prefix: 'anthropic-ratelimit-unified-7d', length: 'week' },
] as const satisfies readonly { prefix: string; length: PlanUsageWindow['length'] }[];

const CODEX_SHARE = '-used-percent';

/**
 * The window a Codex bucket stands for where the vendor sent no length beside it.
 *
 * @summary Captured traffic carries `-used-percent` alone: the `-window-minutes` the vendor's own
 * client reads is documented but absent on the wire, so requiring it dropped every Codex reading.
 * What the names do carry is order, primary being the narrower window and secondary the wider one,
 * which is the same order the two rows on the page run in. So the pairing holds even where the
 * vendor changes how long either window actually runs. A bucket named neither is still dropped,
 * because nothing places it and a guess would print one plan's session share as its week.
 */
const CODEX_BUCKET_LENGTHS = [
  { named: '-primary', length: '5h' },
  { named: '-secondary', length: 'week' },
] as const satisfies readonly { named: string; length: PlanUsageWindow['length'] }[];

function trimmed(value: string | null): string {
  return value?.trim() ?? '';
}

function numberFrom(value: string | null): number | undefined {
  if (trimmed(value) === '') {
    return undefined;
  }

  const read = Number(trimmed(value));

  return Number.isFinite(read) ? read : undefined;
}

/**
 * The share of a window a vendor says is gone, on the one scale every reading crosses in.
 *
 * @summary A window past its whole reads as spent rather than as more than spent, because a meter
 * cannot draw past its own end and a figure over a hundred percent would say a person is still
 * sending through a plan that has already refused them.
 */
function shareOf(value: string | null, whole: number): number | undefined {
  const read = numberFrom(value);

  if (read === undefined || read < 0) {
    return undefined;
  }

  return Math.min(read / whole, 1);
}

/**
 * The instant a vendor named, whether it stamped a date or counted seconds since the epoch.
 *
 * @summary Two vendors disagree about the form and one of them has changed it once already, so the
 * reader takes either rather than pinning a spelling that a version bump would silently empty.
 */
function instantFrom(value: string | null): number | undefined {
  const seconds = numberFrom(value);

  if (seconds !== undefined) {
    return seconds > 0 ? Math.round(seconds * MS_IN_SECOND) : undefined;
  }

  const stamped = Date.parse(trimmed(value));

  return Number.isNaN(stamped) ? undefined : stamped;
}

function windowOf(
  length: PlanUsageWindow['length'],
  spentShare: number,
  resetsAt: number | undefined,
): PlanUsageWindow {
  return resetsAt === undefined ? { length, spentShare } : { length, spentShare, resetsAt };
}

function anthropicWindows(headers: Headers): readonly PlanUsageWindow[] {
  return ANTHROPIC_UNIFIED.flatMap(({ prefix, length }) => {
    const spentShare = shareOf(headers.get(`${prefix}-utilization`), A_WHOLE);

    return spentShare === undefined
      ? []
      : [windowOf(length, spentShare, instantFrom(headers.get(`${prefix}-reset`)))];
  });
}

function codexReset(headers: Headers, bucket: string, now: number): number | undefined {
  const stamped = instantFrom(headers.get(`${bucket}-reset-at`));

  if (stamped !== undefined) {
    return stamped;
  }

  const counted = numberFrom(headers.get(`${bucket}-reset-after-seconds`));

  return counted === undefined ? undefined : now + counted * MS_IN_SECOND;
}

function lengthOf(
  windowMinutes: number | undefined,
  bucket: string,
): PlanUsageWindow['length'] | undefined {
  if (windowMinutes !== undefined && windowMinutes > 0) {
    return windowMinutes < MINUTES_IN_A_DAY ? '5h' : 'week';
  }

  return CODEX_BUCKET_LENGTHS.find((named) => bucket.endsWith(named.named))?.length;
}

/**
 * The window one Codex bucket stands for, read from the length the vendor sent with it.
 *
 * @summary The length comes off `-window-minutes` where the vendor sends it, because a plan can
 * carry a bucket this engine has never heard of and the wire is the only authority on how long its
 * window runs. Captured traffic sends no such header, so the bucket's own name places it instead.
 */
function codexWindowOf(headers: Headers, bucket: string, now: number): PlanUsageWindow | undefined {
  const length = lengthOf(numberFrom(headers.get(`${bucket}-window-minutes`)), bucket);
  const spentShare = shareOf(headers.get(`${bucket}${CODEX_SHARE}`), A_HUNDRED);

  if (length === undefined || spentShare === undefined) {
    return undefined;
  }

  return windowOf(length, spentShare, codexReset(headers, bucket, now));
}

function codexWindows(headers: Headers, now: number): readonly PlanUsageWindow[] {
  const found: PlanUsageWindow[] = [];

  for (const name of headers.keys()) {
    if (!name.endsWith(CODEX_SHARE)) continue;

    const window = codexWindowOf(headers, name.slice(0, -CODEX_SHARE.length), now);

    if (window !== undefined) found.push(window);
  }

  return found;
}

/**
 * What the vendor behind one answer says about the plan that served it.
 *
 * @summary This is the only figure on the Usage page a vendor answered for, and it rides an answer
 * the request was already making rather than a poll, so it costs nothing and stays as fresh as the
 * traffic. A vendor that reports nothing leaves the reading empty rather than reading as unspent,
 * because a plan nobody measured and a plan measured at zero must never draw the same meter.
 */
export function planUsageTheProviderReports(
  headers: Headers,
  now: number,
): readonly PlanUsageWindow[] {
  return [...anthropicWindows(headers), ...codexWindows(headers, now)];
}
