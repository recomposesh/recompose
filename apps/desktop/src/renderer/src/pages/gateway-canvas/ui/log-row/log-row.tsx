import type { Account, LogRow as LoggedRequest } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useEffect, useState } from 'react';

import { requestFailed, requestInFlight } from '../../../../entities/request-log';
import { servedAt, servedByAccount, servedByProvider, tookFor } from './logged-request';

const TOO_MANY_REQUESTS = 429;

function statusInk(logged: LoggedRequest, ongoing: boolean): string {
  if (ongoing) {
    return 'text-accent-ink';
  }

  if (logged.status === TOO_MANY_REQUESTS) {
    return 'text-attention-ink';
  }

  return requestFailed(logged) ? 'text-danger-ink' : 'text-running-ink';
}

function statusCell(logged: LoggedRequest, ongoing: boolean): ReactNode {
  return ongoing ? <span aria-label="in progress">live</span> : logged.status;
}

function modelArrow(asked: string, resolved: string): string {
  return asked === '' || resolved === '' ? '' : '→';
}

/**
 * What stands where a duration would, which on a failed request is nothing a person can see.
 *
 * @summary A number there would say the failure took that long to arrive rather than that nothing
 * was served, and a glyph would mean separator a third time in one row, so the cell reads empty and
 * says why to a screen reader alone.
 */
function durationCell(took: string): ReactNode {
  return took === '' ? <span className="sr-only">no duration</span> : took;
}

function useOngoingDuration(startedAt: number, ongoing: boolean): string {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!ongoing) {
      return undefined;
    }

    setNow(Date.now());
    const ticking = setInterval(() => {
      setNow(Date.now());
    }, 100);

    return () => {
      clearInterval(ticking);
    };
  }, [ongoing, startedAt]);

  return ongoing ? tookFor(Math.max(0, now - startedAt)) : '';
}

/**
 * The ink the provider and account cell reads in, which fades once the account has departed.
 *
 * @summary The raw id a departed account leaves behind is a fact about the past rather than a name
 * that still answers to anything, so it reads in the quieter ink the ghost vocabulary already uses.
 */
function targetInk(account: Account | undefined): string {
  return account === undefined ? 'text-ink-secondary' : '';
}

type ModelJourney = { asked: string; resolved: string };

function modelJourneyOf(logged: LoggedRequest): ModelJourney {
  return { asked: logged.virtualModel ?? '', resolved: logged.providerModel ?? '' };
}

function modelJourneyCell({ asked, resolved }: ModelJourney): ReactNode {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-1">
      <span className="max-w-1/2 shrink-0 truncate" title={asked}>
        {asked}
      </span>
      <span aria-hidden className="shrink-0 text-ink-tertiary">
        {modelArrow(asked, resolved)}
      </span>
      <span className="min-w-0 truncate text-ink-secondary" title={resolved}>
        {resolved}
      </span>
    </span>
  );
}

type LogRowProps = {
  /** The request this row stands for, as the gateway logged it. */
  logged: LoggedRequest;
  /** The account that served it, or nothing where that account has left the registry. */
  account: Account | undefined;
  /** The row's own id, which the list points its cursor at without moving focus. */
  id: string;
  /** Whether the row cursor rests here, which is the row a copy takes. */
  underCursor?: boolean;
  /** Where the row stands in the whole run, counted from one, because only a few rows are drawn. */
  place?: number;
  /** How many rows the whole run holds, which the drawn few stand in for. */
  wholeRun?: number;
};

/**
 * One request the gateway answered, read across a fixed grid.
 *
 * @summary Reach for it inside the logs drawer's list and nowhere else. The columns hold their
 * places down the run, so a person scanning for a status or a duration reads down one column rather
 * than hunting across each line. The fixed cells never give way: what gives way first is the
 * provider model, then the account, because a truncated account is still readable next to its
 * provider while a truncated time says nothing at all. The status digits carry the standing and the
 * ink only reinforces it, so a screen painting no color loses nothing. A request the gateway never
 * served shows no duration, since a number there would claim something answered when nothing did.
 */
export function LogRow({ logged, account, id, underCursor = false, place, wholeRun }: LogRowProps) {
  const journey = modelJourneyOf(logged);
  const ongoing = requestInFlight(logged);
  const liveDuration = useOngoingDuration(logged.at, ongoing);
  const took = ongoing ? liveDuration : tookFor(logged.durationMs);
  const cursor = underCursor ? '-outline-offset-2 outline-2 outline-accent' : '';

  return (
    <div
      aria-posinset={place}
      aria-selected={underCursor}
      aria-setsize={wholeRun}
      className={`flex h-5 items-center gap-1 px-2 font-mono text-mono-caption whitespace-nowrap text-ink ${cursor}`}
      id={id}
      role="option"
    >
      <span className="w-16 shrink-0 text-ink-secondary tabular-nums">{servedAt(logged.at)}</span>
      <span className="w-10 shrink-0 text-ink-secondary">{logged.method}</span>
      {modelJourneyCell(journey)}
      <span className={`w-20 shrink-0 truncate text-end ${targetInk(account)}`}>
        {servedByProvider(logged)}
      </span>
      <span
        className={`w-36 shrink-0 truncate ${targetInk(account)}`}
        title={servedByAccount(logged, account)}
      >
        {servedByAccount(logged, account)}
      </span>
      <span className={`w-8 shrink-0 text-end tabular-nums ${statusInk(logged, ongoing)}`}>
        {statusCell(logged, ongoing)}
      </span>
      <span className="w-10 shrink-0 text-end text-ink-secondary tabular-nums">
        {durationCell(took)}
      </span>
    </div>
  );
}
