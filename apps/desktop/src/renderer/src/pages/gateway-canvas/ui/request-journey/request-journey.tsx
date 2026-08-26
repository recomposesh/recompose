import type { Account, LogRow as LoggedRequest } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { CopyButton } from '../../../../shared/ui';
import { copiedJourney, journeyOf } from './journey-reading';

const NOTHING_SELECTED = 'Select a request to read what it came to.';

const AWAY_WITH_THE_JOURNEY = '@max-[40rem]:hidden';

type JourneyLine = ReturnType<typeof journeyOf>[number];

function journeyLine(line: JourneyLine, seat: number): ReactNode {
  return (
    <div
      className="flex gap-2 border-t border-line-faint py-1 first:border-t-0"
      key={`${line.label}-${String(seat)}`}
    >
      <dt className="w-20 shrink-0 text-caption text-ink-secondary">{line.label}</dt>
      <dd className="min-w-0 flex-1 font-mono text-mono-caption wrap-break-word text-ink">
        {line.reading}
      </dd>
    </div>
  );
}

/**
 * The reading itself, which scrolls under its own keyboard focus.
 *
 * @summary It takes a tab stop because it scrolls: a person who cannot use a pointer has no other
 * way to reach a cause that sits below the fold, and a scrollable region nothing can focus is the
 * one accessibility fault this panel could actually strand somebody with.
 */
function journeyBody(logged: LoggedRequest, account: Account | undefined): ReactNode {
  return (
    <dl className="min-h-0 flex-1 overflow-y-auto focus-ring px-3 py-1.5 outline-none" tabIndex={0}>
      {journeyOf(logged, account).map(journeyLine)}
    </dl>
  );
}

function copyControl(logged: LoggedRequest, account: Account | undefined): ReactNode {
  return (
    <CopyButton
      announcement="Request detail copied."
      label="Copy request detail"
      value={copiedJourney(logged, account)}
    />
  );
}

type RequestJourneyProps = {
  /** The request the cursor rests on, or nothing while the list holds no cursor at all. */
  logged: LoggedRequest | undefined;
  /** The account that served it, or nothing where that account has left the registry. */
  account: Account | undefined;
};

/**
 * What one request came to, read end to end beside the run it was picked from.
 *
 * @summary Reach for it inside the logs drawer, where a person who has found a failed row now wants
 * the reason behind it. It stands beside the list rather than over the canvas, because the drawer
 * already sits under the stage so that nothing it opens covers something a person was about to
 * press. It follows the list's own cursor rather than holding a selection of its own, so the arrows
 * that walk the run are also what read a request, and reaching the reason never needs a pointer.
 *
 * It shows what the gateway read and never what the request carried: the models, the router, each
 * child the gateway reached, the sentence the caller was handed, and the sentence a provider sent
 * about its own refusal. Nothing a person asked and nothing a model answered can reach here,
 * because the contract the row crosses on refuses to carry either.
 *
 * The whole reading copies in one press, since a person reading it is usually about to paste it to
 * somebody who can help. It leaves a drawer too narrow to hold it rather than clipping, the way the
 * filters above it do, because a clipped panel reads as broken while a missing one reads as put away.
 */
export function RequestJourney({ logged, account }: RequestJourneyProps) {
  return (
    <aside
      aria-label="Request detail"
      className={`flex w-72 shrink-0 flex-col overflow-hidden border-s border-line-faint ${AWAY_WITH_THE_JOURNEY}`}
      data-request-journey=""
    >
      <header className="flex h-status-bar shrink-0 items-center gap-2 border-b border-line-faint px-3">
        <h3 className="truncate text-detail font-semibold text-ink">Request detail</h3>
        {logged === undefined ? null : (
          <span className="ms-auto flex">{copyControl(logged, account)}</span>
        )}
      </header>
      {logged === undefined ? (
        <p className="px-3 py-2 text-detail text-ink-secondary">{NOTHING_SELECTED}</p>
      ) : (
        journeyBody(logged, account)
      )}
    </aside>
  );
}
