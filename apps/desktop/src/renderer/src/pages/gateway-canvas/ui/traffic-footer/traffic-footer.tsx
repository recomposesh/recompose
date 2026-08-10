import type { LogRow } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useState, useSyncExternalStore } from 'react';

import type { TrafficAggregates } from '../../lib/traffic-aggregates';

import { engineLogsQueryOptions } from '../../../../shared/api';
import {
  logsDrawerOpen,
  subscribeToLogsDrawerVisibility,
  toggleLogsDrawer,
} from '../../../../shared/lib';
import { trafficAggregates } from '../../lib/traffic-aggregates';
import { compactCount, pluralized, readDuration } from './footer-readings';

const DISPLAY_TICK_MS = 1_000;

const NOTHING_SERVED: readonly LogRow[] = [];

const CLIENT_APPS_MEANING = 'Distinct client apps seen in the last minute.';

const AWAY_WITH_THE_TALLY = '@max-[45rem]:hidden';

const AWAY_WITH_THE_TOKENS = '@max-[37rem]:hidden';

const AWAY_WITH_THE_LATENCY = '@max-[29rem]:hidden';

type TrafficFooterProps = {
  /** The gateway whose served requests the traffic side reads. */
  slug: string;
  /** Cards standing on the canvas, which the composition tally counts. */
  nodes: number;
  /** Cables standing between those cards, which the composition tally counts. */
  wires: number;
};

/**
 * The instant the strip reads its window against, moved along once a second while it stands.
 *
 * @summary The rows arrive on the transport's own cadence, which is far faster than anybody reads,
 * and a quiet gateway sends nothing at all. A clock of the strip's own settles both: a busy gateway
 * repaints once a second rather than per frame, and a quiet one still decays to zeros.
 */
function useDisplayTick(): number {
  const [instant, setInstant] = useState(() => Date.now());

  useEffect(() => {
    const beat = setInterval(() => {
      setInstant(Date.now());
    }, DISPLAY_TICK_MS);

    return () => {
      clearInterval(beat);
    };
  }, []);

  return instant;
}

function reading(children: ReactNode): ReactNode {
  return <b className="font-medium text-ink">{children}</b>;
}

function counted(count: number, thing: string): ReactNode {
  return (
    <>
      {reading(compactCount(count))}
      {` ${pluralized(count, thing)}`}
    </>
  );
}

function errorCount(errors: number): ReactNode {
  if (errors === 0) {
    return null;
  }

  return (
    <span className="text-danger-ink">
      <b className="font-medium">{compactCount(errors)}</b>
      {` ${pluralized(errors, 'error')}`}
    </span>
  );
}

function trafficSide(traffic: TrafficAggregates, meaning: string): ReactNode {
  return (
    <>
      <span>
        {reading(compactCount(traffic.requestsPerMinute))}
        {' req/min'}
      </span>
      <span className={AWAY_WITH_THE_LATENCY}>
        {'p95 '}
        {reading(readDuration(traffic.p95Ms))}
      </span>
      <span aria-describedby={meaning}>{counted(traffic.clientApps, 'client app')}</span>
      <span aria-hidden className={`h-3.5 w-px bg-line-subtle ${AWAY_WITH_THE_TOKENS}`} />
      <span className={AWAY_WITH_THE_TOKENS}>
        {reading(compactCount(traffic.tokensPerMinute))}
        {' tok/min'}
      </span>
      {errorCount(traffic.errors)}
    </>
  );
}

function compositionTally(nodes: number, wires: number): ReactNode {
  return (
    <span className={AWAY_WITH_THE_TALLY}>
      {counted(nodes, 'node')}
      {' · '}
      {counted(wires, 'wire')}
    </span>
  );
}

/**
 * The strip under the canvas, reading the minute of traffic behind this gateway.
 *
 * @summary Reach for it at the foot of the gateway detail. It reads as selectable text rather than
 * as a control, so a person can take a reading into a bug report, and the one thing on it to press
 * is the disclosure control that opens the logs drawer. An idle gateway reads zeros instead of
 * hiding, because the surface a person will watch under load has to already stand in place. The
 * cells leave in a fixed order as the pane narrows, and the request rate and the error count are
 * the last two standing.
 */
export function TrafficFooter({ slug, nodes, wires }: TrafficFooterProps) {
  const { data: rows } = useQuery(engineLogsQueryOptions(slug));
  const drawerOpen = useSyncExternalStore(subscribeToLogsDrawerVisibility, logsDrawerOpen);
  const meaning = useId();
  const traffic = trafficAggregates(rows ?? NOTHING_SERVED, useDisplayTick());

  return (
    <footer className="@container flex h-status-bar shrink-0 items-center gap-3.5 border-t border-line-subtle bg-surface-toolbar px-3.5 font-mono text-mono-value whitespace-nowrap text-ink-secondary select-text">
      {trafficSide(traffic, meaning)}
      <span className="flex-1" />
      {compositionTally(nodes, wires)}
      <button
        aria-expanded={drawerOpen}
        className="push-button focus-ring"
        onClick={toggleLogsDrawer}
        type="button"
      >
        Logs
      </button>
      <span hidden id={meaning}>
        {CLIENT_APPS_MEANING}
      </span>
    </footer>
  );
}
