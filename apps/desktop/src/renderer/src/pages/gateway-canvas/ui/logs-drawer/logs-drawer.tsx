import type { Account, GatewayConfig, LogRow as LoggedRequest } from '@recompose/contracts';
import type { ReactNode } from 'react';

import { useState, useSyncExternalStore } from 'react';

import type { InspectorSubject } from '../gateway-canvas-page/canvas-subjects';
import type { LogFilter, SubjectHeading } from './log-subject-wording';

import { requestFailed, requestInFlight } from '../../../../entities/request-log';
import {
  closeLogsDrawer,
  keepPanelWidth,
  panelBounds,
  panelWidth,
  setPanelWidth,
  subscribeToPanelWidths,
  toggleLogsDrawer,
} from '../../../../shared/lib';
import { Icon, PanelSeparator, SegmentedControl, StatusChip } from '../../../../shared/ui';
import { logScope } from '../../lib/log-scope';
import { LogList } from '../log-list/log-list';
import { nothingYetFor, scopeKey, subjectHeading } from './log-subject-wording';

const streamStanding = {
  running: { word: 'Live', tone: 'positive' },
  stopped: { word: 'Stopped', tone: 'inert' },
} as const;

const logFilters = [
  { value: 'all', label: 'All' },
  { value: 'success', label: 'Success', tone: 'positive' },
  { value: 'errors', label: 'Errors', tone: 'danger' },
] as const;

function filteredScope(
  subject: InspectorSubject,
  filter: LogFilter,
): (row: LoggedRequest) => boolean {
  const inSubject = logScope(subject, false);

  if (filter === 'all') {
    return inSubject;
  }

  const failed = filter === 'errors';

  return (row) => inSubject(row) && !requestInFlight(row) && requestFailed(row) === failed;
}

type LogControls = {
  filter: LogFilter;
  onFilterChange: (filter: LogFilter) => void;
};

function logControls({ filter, onFilterChange }: LogControls): ReactNode {
  return (
    <SegmentedControl
      label="Log filter"
      onChangeValue={onFilterChange}
      options={logFilters}
      value={filter}
    />
  );
}

type DrawerHead = {
  heading: SubjectHeading;
  serving: 'running' | 'stopped';
  controls: LogControls;
};

function drawerHeader({ heading, serving, controls }: DrawerHead): ReactNode {
  const stream = streamStanding[serving];

  return (
    <header className="flex h-status-bar shrink-0 items-center gap-2.5 border-b border-line-faint px-3">
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 className="truncate text-detail font-semibold text-ink">Logs for {heading.name}</h2>
        <span className="shrink-0 text-caption font-medium text-ink-secondary">{heading.type}</span>
      </div>
      <StatusChip tone={stream.tone} word={stream.word} />
      <div className="ms-auto flex min-w-0 items-center gap-2">
        {logControls(controls)}
        <button
          aria-label="Close logs"
          className="flex size-6 shrink-0 items-center justify-center rounded-control focus-ring text-ink-secondary hover:bg-surface-hover active:bg-surface-pressed"
          onClick={closeLogsDrawer}
          type="button"
        >
          <Icon className="size-4" name="close" />
        </button>
      </div>
    </header>
  );
}

function resizeEdge(height: number): ReactNode {
  return (
    <PanelSeparator
      axis="block"
      bounds={panelBounds.logs}
      label="Logs height"
      onCollapse={closeLogsDrawer}
      onResize={(asked) => {
        setPanelWidth('logs', asked);
      }}
      onRestore={toggleLogsDrawer}
      onSettled={() => {
        keepPanelWidth('logs');
      }}
      panelEdge="leading"
      width={height}
    />
  );
}

type LogsDrawerProps = {
  /** The gateway whose requests the drawer streams, which titles it. */
  gateway: GatewayConfig;
  /** The registry the rows read their accounts against, naming what served each request. */
  accounts: readonly Account[];
  /** Every request the gateway has served, newest first, before any scope narrows it. */
  rows: readonly LoggedRequest[];
  /** Whether the gateway is still answering, which is what the stream state reads. */
  serving: 'running' | 'stopped';
  /** What stands selected on the canvas, which is the scope the rows narrow to. */
  subject: InspectorSubject;
  /** Whether the drawer is on its way off screen, which is what plays its exit. */
  leaving?: boolean;
};

/**
 * The gateway's request log, standing under the canvas while a person reads it.
 *
 * @summary Reach for it from the gateway page and nowhere else. It sits under the stage rather than
 * over it, so the composition stays visible and every card stays reachable while the rows stream:
 * nothing the drawer opens ever covers something a person was about to press. The selected subject
 * names the header and narrows the rows, while the All, Success, and Errors segments decide which
 * outcomes stay in that scope. The stream state holds its place in the header instead of vanishing,
 * because a gateway that stopped is a thing a person needs to read rather than to guess from an
 * absence. Dragging the top edge sizes the drawer and dragging it well down puts it away, which is
 * the same gesture every other panel in the app answers.
 */
export function LogsDrawer({
  gateway,
  accounts,
  rows,
  serving,
  subject,
  leaving = false,
}: LogsDrawerProps) {
  const [filter, setFilter] = useState<LogFilter>('all');
  const height = useSyncExternalStore(subscribeToPanelWidths, logsHeight);
  const heading = subjectHeading(gateway, accounts, subject);
  const scope = scopeKey(subject);

  return (
    <>
      {resizeEdge(height)}
      <section
        className={`flex shrink-0 flex-col overflow-hidden border-t border-line-subtle bg-surface-card ${leaving ? 'logs-drawer-leaving' : 'logs-drawer'}`}
        data-logs-drawer=""
        style={{ height: `${String(height)}px` }}
      >
        {drawerHeader({
          heading,
          serving,
          controls: {
            filter,
            onFilterChange: setFilter,
          },
        })}
        <LogList
          accounts={accounts}
          nothingYet={nothingYetFor(subject, filter)}
          rows={rows.filter(filteredScope(subject, filter))}
          scope={`${scope} ${filter}`}
        />
      </section>
    </>
  );
}

function logsHeight(): number {
  return panelWidth('logs');
}
